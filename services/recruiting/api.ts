import { Router } from 'express';
import { analyzeJD } from './jdAgent.js';
import { scoreCandidate } from './candidateScoring.js';
import { buildInterviewPlan } from './interview.js';
import { makeHiringDecision } from './decision.js';
import { recommendCompensation } from './compensation.js';
import { createOffer, buildEngagementPlan, buildOnboardingPlan } from './lifecycle.js';
import { searchWebCandidates } from './webSourcing.js';
import { generateAI } from './aiGateway.js';
import { deleteAICredential, getAICredential, listAIProviders, saveAICredential } from './credentialStore.js';
import type { AIProvider } from './aiGateway.js';
import { createJob, getJob, listJobs } from './jobStore.js';

const router = Router();
type SessionCredential = { provider: AIProvider; apiKey: string; model?: string };
const sessions = new Map<string, SessionCredential>();
function tenantId(req: any): string { return String(req.header('x-tenant-id') || 'demo-tenant'); }
async function getCredential(req: any): Promise<SessionCredential> {
  const tenant = tenantId(req);
  const session = sessions.get(tenant);
  if (session) return session;
  if (process.env.GEMINI_API_KEY) { const c = { provider: 'gemini' as AIProvider, apiKey: process.env.GEMINI_API_KEY, model: 'gemini-3.6-flash' }; sessions.set(tenant, c); return c; }
  const providers = await listAIProviders(tenant).catch(() => [] as AIProvider[]);
  const provider = providers[0];
  if (provider) { const apiKey = await getAICredential(tenant, provider); if (apiKey) { const c = { provider, apiKey, model: provider === 'gemini' ? 'gemini-3.6-flash' : undefined }; sessions.set(tenant, c); return c; } }
  throw new Error('Connect an AI provider first');
}
router.get('/health', (_req, res) => res.json({ ok: true, service: 'recruiting-os' }));
router.post('/ai/connect', async (req, res) => { try { const { provider, apiKey, model } = req.body || {}; if (!['gemini','openai','anthropic'].includes(provider)) return res.status(400).json({ error: 'Unsupported provider' }); if (!String(apiKey || '').trim()) return res.status(400).json({ error: 'API key is required' }); const selectedModel = model || (provider === 'gemini' ? 'gemini-3.6-flash' : undefined); await generateAI({ provider, apiKey: String(apiKey).trim(), model: selectedModel, system: 'Reply with OK only.', prompt: 'OK', temperature: 0, maxTokens: 8 }); const tenant = tenantId(req); sessions.set(tenant, { provider, apiKey: String(apiKey).trim(), model: selectedModel }); try { await saveAICredential(tenant, provider, String(apiKey).trim()); } catch {} res.json({ connected: true, provider, model: selectedModel }); } catch (error: any) { res.status(400).json({ error: error?.message || 'Unable to connect AI provider' }); } });
router.get('/ai/status', async (req, res) => { try { const tenant = tenantId(req); const session = sessions.get(tenant); if (session) return res.json({ connected: true, provider: session.provider, model: session.model }); if (process.env.GEMINI_API_KEY) return res.json({ connected: true, provider: 'gemini', model: 'gemini-3.6-flash', source: 'environment' }); res.json({ connected: false, provider: null, model: null }); } catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to read AI status' }); } });
router.delete('/ai/disconnect', async (req, res) => { const tenant = tenantId(req); sessions.delete(tenant); try { await deleteAICredential(tenant, 'gemini'); await deleteAICredential(tenant, 'openai'); await deleteAICredential(tenant, 'anthropic'); } catch {} res.json({ disconnected: true }); });
router.post('/jd/analyze', async (req, res) => { try { const c = await getCredential(req); const prompt = String(req.body?.text || ''); const analysis = await analyzeJD(prompt, c.provider, c.apiKey, c.model); const job = await createJob(tenantId(req), prompt, analysis); res.json({ ...analysis, jobId: job.id, job }); } catch (error: any) { res.status(400).json({ error: error?.message || 'JD analysis failed' }); } });
router.get('/jobs', async (req, res) => { try { res.json({ jobs: await listJobs(tenantId(req)) }); } catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to list jobs' }); } });
router.get('/jobs/:id', async (req, res) => { try { const job = await getJob(tenantId(req), String(req.params.id)); if (!job) return res.status(404).json({ error: 'Job not found' }); res.json(job); } catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to load job' }); } });
router.post('/source/search', async (req, res) => { try { const c = await getCredential(req); const role = req.body?.role || {}; const jobId = role.jobId || req.body?.jobId; res.json({ jobId: jobId || null, candidates: await searchWebCandidates(c.apiKey, role, Number(req.body?.limit) || 8) }); } catch (error: any) { res.status(400).json({ error: error?.message || 'Candidate sourcing failed' }); } });
router.post('/candidate/score', async (req, res) => { try { const { candidate, requirement } = req.body || {}; if (!candidate || !requirement) return res.status(400).json({ error: 'candidate and requirement are required' }); const c = await getCredential(req); res.json(await scoreCandidate(candidate, requirement, c.provider, c.apiKey, c.model)); } catch (error: any) { res.status(400).json({ error: error?.message || 'Candidate scoring failed' }); } });
router.post('/interview/plan', (req, res) => res.json(buildInterviewPlan(String(req.body?.role || 'the role'), Array.isArray(req.body?.competencies) ? req.body.competencies : [])));
router.post('/decision', (req, res) => { try { res.json(makeHiringDecision(req.body)); } catch (error: any) { res.status(400).json({ error: error?.message || 'Decision failed' }); } });
router.post('/compensation/recommend', (req, res) => { try { res.json(recommendCompensation(req.body?.observations || [], req.body?.internalComparable)); } catch (error: any) { res.status(400).json({ error: error?.message || 'Compensation analysis failed' }); } });
router.post('/offer/draft', (req, res) => { try { res.json(createOffer(req.body)); } catch (error: any) { res.status(400).json({ error: error?.message || 'Offer drafting failed' }); } });
router.post('/engagement/plan', (req, res) => { try { res.json(buildEngagementPlan(req.body)); } catch (error: any) { res.status(400).json({ error: error?.message || 'Engagement planning failed' }); } });
router.post('/onboarding/plan', (req, res) => { try { res.json(buildOnboardingPlan(req.body)); } catch (error: any) { res.status(400).json({ error: error?.message || 'Onboarding planning failed' }); } });
export default router;
