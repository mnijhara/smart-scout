import { Router } from 'express';
import { analyzeJD } from './jdAgent.js';
import { scoreCandidate } from './candidateScoring.js';
import { buildInterviewPlan } from './interview.js';
import { makeHiringDecision } from './decision.js';
import { recommendCompensation } from './compensation.js';
import { createOffer, transitionOffer, buildEngagementPlan, buildOnboardingPlan } from './lifecycle.js';
import { searchWebCandidates } from './webSourcing.js';
import { generateAI } from './aiGateway.js';
import { deleteAICredential, getAICredential, listAIProviders, saveAICredential } from './credentialStore.js';
import type { AIProvider } from './aiGateway.js';
import { createJob, getJob, listJobs } from './jobStore.js';
import { saveCandidates, listCandidates, updateCandidateScore } from './candidateStore.js';
import { createInterview, getInterview, listInterviews, recordInterviewAnswer, completeInterview } from './interviewStore.js';
import { saveHiringState, listHiringStates } from './hiringStateStore.js';
import { listApprovals, requestApproval } from './controlPlane.js';

const router = Router();
type SessionCredential = { provider: AIProvider; apiKey: string; model?: string };
const sessions = new Map<string, SessionCredential>();
function tenantId(req: any): string { return String(req.header('x-tenant-id') || ''); }
async function getCredential(req: any): Promise<SessionCredential> {
  const tenant = tenantId(req);
  if (!tenant) throw new Error('Workspace identity is missing');
  const session = sessions.get(tenant);
  if (session) return session;
  if (process.env.GEMINI_API_KEY) {
    const c = { provider: 'gemini' as AIProvider, apiKey: process.env.GEMINI_API_KEY, model: 'gemini-3.6-flash' };
    sessions.set(tenant, c); return c;
  }
  const providers = await listAIProviders(tenant).catch(() => [] as AIProvider[]);
  const provider = providers[0];
  if (provider) {
    const apiKey = await getAICredential(tenant, provider);
    if (apiKey) {
      const c = { provider, apiKey, model: provider === 'gemini' ? 'gemini-3.6-flash' : undefined };
      sessions.set(tenant, c); return c;
    }
  }
  throw new Error('Connect an AI provider first');
}

async function latestApproval(tenant: string, jobId: string, action: 'jd_approval' | 'decision' | 'compensation' | 'offer' | 'employee_create') {
  const rows = await listApprovals(tenant, jobId);
  return rows.find(x => x.action === action) || null;
}
async function requireApproval(req: any, jobId: string, action: Parameters<typeof latestApproval>[2]) {
  const approval = await latestApproval(tenantId(req), jobId, action);
  if (!approval || approval.status !== 'approved') throw new Error(`Human approval required before ${action.replace('_', ' ')}.`);
  return approval;
}
async function createGate(req: any, jobId: string, action: Parameters<typeof latestApproval>[2], note: string) {
  const tenant = tenantId(req);
  const existing = await latestApproval(tenant, jobId, action);
  if (existing?.status === 'pending' || existing?.status === 'approved') return existing;
  return requestApproval({ tenantId: tenant, jobId, action, requestedBy: 'recruiter', note });
}

router.get('/health', (_req, res) => res.json({ ok: true, service: 'recruiting-os' }));
router.post('/ai/connect', async (req, res) => { try {
  const { provider, apiKey, model } = req.body || {};
  if (!['gemini', 'openai', 'anthropic'].includes(provider)) return res.status(400).json({ error: 'Unsupported provider' });
  const credential = String(apiKey || '').trim(); if (!credential) return res.status(400).json({ error: 'API key is required' });
  const selectedModel = model || (provider === 'gemini' ? 'gemini-3.6-flash' : undefined);
  await generateAI({ provider, apiKey: credential, model: selectedModel, system: 'Reply with OK only.', prompt: 'OK', temperature: 0, maxTokens: 8 });
  const tenant = tenantId(req); await saveAICredential(tenant, provider, credential); sessions.set(tenant, { provider, apiKey: credential, model: selectedModel });
  res.json({ connected: true, provider, model: selectedModel });
} catch (error: any) { res.status(400).json({ error: error?.message || 'Unable to connect AI provider' }); } });
router.get('/ai/status', async (req, res) => { try {
  const tenant = tenantId(req); const session = sessions.get(tenant);
  if (session) return res.json({ connected: true, provider: session.provider, model: session.model, source: 'secure-vault' });
  if (process.env.GEMINI_API_KEY) return res.json({ connected: true, provider: 'gemini', model: 'gemini-3.6-flash', source: 'server-environment' });
  const providers = await listAIProviders(tenant).catch(() => [] as AIProvider[]);
  if (providers[0]) return res.json({ connected: true, provider: providers[0], model: providers[0] === 'gemini' ? 'gemini-3.6-flash' : undefined, source: 'secure-vault' });
  res.json({ connected: false, provider: null, model: null });
} catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to read AI status' }); } });
router.delete('/ai/disconnect', async (req, res) => { const tenant = tenantId(req); sessions.delete(tenant); try { await Promise.all((['gemini', 'openai', 'anthropic'] as AIProvider[]).map(p => deleteAICredential(tenant, p))); } catch {} res.json({ disconnected: true }); });

router.post('/jd/analyze', async (req, res) => { try { const c = await getCredential(req); const prompt = String(req.body?.text || ''); if (!prompt.trim()) return res.status(400).json({ error: 'Hiring prompt is required' }); const analysis = await analyzeJD(prompt, c.provider, c.apiKey, c.model); const job = await createJob(tenantId(req), prompt, analysis); res.json({ ...analysis, jobId: job.id, job }); } catch (error: any) { res.status(400).json({ error: error?.message || 'JD analysis failed' }); } });
router.get('/jobs', async (req, res) => { try { res.json({ jobs: await listJobs(tenantId(req)) }); } catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to list jobs' }); } });
router.get('/jobs/:id', async (req, res) => { try { const job = await getJob(tenantId(req), String(req.params.id)); if (!job) return res.status(404).json({ error: 'Job not found' }); res.json(job); } catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to load job' }); } });

router.post('/source/search', async (req, res) => { try {
  const jobId = String(req.body?.jobId || req.body?.role?.jobId || ''); if (!jobId) return res.status(400).json({ error: 'jobId is required before sourcing' });
  await requireApproval(req, jobId, 'jd_approval');
  const c = await getCredential(req); const role = req.body?.role || {}; const candidates = await searchWebCandidates(c.apiKey, role, Number(req.body?.limit) || 8); const saved = await saveCandidates(tenantId(req), jobId, candidates); res.json({ jobId, candidates, savedCandidates: saved });
} catch (error: any) { res.status(400).json({ error: error?.message || 'Candidate sourcing failed' }); } });
router.get('/jobs/:id/candidates', async (req, res) => { try { res.json({ candidates: await listCandidates(tenantId(req), String(req.params.id)) }); } catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to list candidates' }); } });
router.post('/candidate/score', async (req, res) => { try { const { candidate, requirement, jobId, candidateId } = req.body || {}; if (!candidate || !requirement) return res.status(400).json({ error: 'candidate and requirement are required' }); if (jobId) await requireApproval(req, String(jobId), 'jd_approval'); const c = await getCredential(req); const score = await scoreCandidate(candidate, requirement, c.provider, c.apiKey, c.model); if (jobId && candidateId) await updateCandidateScore(tenantId(req), String(candidateId), score); res.json(score); } catch (error: any) { res.status(400).json({ error: error?.message || 'Candidate scoring failed' }); } });

router.post('/interview/plan', async (req, res) => { try { const jobId = String(req.body?.jobId || ''); const candidateId = String(req.body?.candidateId || ''); if (jobId) await requireApproval(req, jobId, 'jd_approval'); if (!candidateId) return res.status(400).json({ error: 'candidateId is required' }); const plan = buildInterviewPlan(String(req.body?.role || 'the role'), Array.isArray(req.body?.competencies) ? req.body.competencies : []); const interview = jobId ? await createInterview(tenantId(req), jobId, candidateId, plan) : null; res.json({ plan, interview }); } catch (error: any) { res.status(400).json({ error: error?.message || 'Interview planning failed' }); } });
router.get('/jobs/:id/interviews', async (req, res) => { try { res.json({ interviews: await listInterviews(tenantId(req), String(req.params.id)) }); } catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to list interviews' }); } });
router.get('/interviews/:id', async (req, res) => { try { const interview = await getInterview(tenantId(req), String(req.params.id)); if (!interview) return res.status(404).json({ error: 'Interview not found' }); res.json(interview); } catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to load interview' }); } });
router.post('/interviews/:id/answers', async (req, res) => { try { const questionId = String(req.body?.questionId || ''); const answer = String(req.body?.answer || ''); if (!questionId || !answer) return res.status(400).json({ error: 'questionId and answer are required' }); const interview = await recordInterviewAnswer(tenantId(req), String(req.params.id), questionId, answer); if (!interview) return res.status(404).json({ error: 'Interview not found' }); res.json(interview); } catch (error: any) { res.status(400).json({ error: error?.message || 'Unable to save interview answer' }); } });
router.post('/interviews/:id/complete', async (req, res) => { try { const interview = await completeInterview(tenantId(req), String(req.params.id), req.body?.evidence || {}); if (!interview) return res.status(404).json({ error: 'Interview not found' }); res.json(interview); } catch (error: any) { res.status(400).json({ error: error?.message || 'Unable to complete interview' }); } });

router.post('/decision', async (req, res) => { try {
  const jobId = String(req.body?.jobId || ''); const candidateId = String(req.body?.candidateId || ''); if (!jobId || !candidateId) return res.status(400).json({ error: 'jobId and candidateId are required' });
  await requireApproval(req, jobId, 'jd_approval');
  const interviews = await listInterviews(tenantId(req), jobId); const completed = interviews.find(x => x.candidateId === candidateId && x.status === 'completed'); if (!completed) return res.status(409).json({ error: 'Complete the candidate interview before creating a hiring decision.' });
  const payload = makeHiringDecision(req.body); const saved = await saveHiringState(tenantId(req), jobId, 'decision', payload, candidateId); const approval = await createGate(req, jobId, 'decision', 'Review the candidate evidence and approve the hiring recommendation before compensation.'); res.json({ ...payload, state: saved, approval });
} catch (error: any) { res.status(400).json({ error: error?.message || 'Decision failed' }); } });

router.post('/compensation/recommend', async (req, res) => { try {
  const jobId = String(req.body?.jobId || ''); if (!jobId) return res.status(400).json({ error: 'jobId is required' }); await requireApproval(req, jobId, 'decision');
  const payload = recommendCompensation(req.body?.observations || [], req.body?.internalComparable); const saved = await saveHiringState(tenantId(req), jobId, 'compensation', payload, req.body?.candidateId); const approval = await createGate(req, jobId, 'compensation', 'Review the compensation recommendation before drafting an offer.'); res.json({ ...payload, state: saved, approval });
} catch (error: any) { res.status(400).json({ error: error?.message || 'Compensation analysis failed' }); } });

router.post('/offer/draft', async (req, res) => { try {
  const jobId = String(req.body?.jobId || ''); if (!jobId) return res.status(400).json({ error: 'jobId is required' }); await requireApproval(req, jobId, 'compensation');
  const payload = createOffer(req.body); const saved = await saveHiringState(tenantId(req), jobId, 'offer', payload, req.body?.candidateId); const approval = await createGate(req, jobId, 'offer', 'Review the offer package before it can be sent to the candidate.'); res.json({ ...payload, state: saved, approval });
} catch (error: any) { res.status(400).json({ error: error?.message || 'Offer drafting failed' }); } });
router.post('/offer/transition', async (req, res) => { try {
  const jobId = String(req.body?.jobId || ''); const candidateId = req.body?.candidateId ? String(req.body.candidateId) : undefined; const next = String(req.body?.status || '') as any; if (!jobId) return res.status(400).json({ error: 'jobId is required' });
  const states = await listHiringStates(tenantId(req), jobId, 'offer'); const latest = states[0]?.payload; if (!latest) return res.status(404).json({ error: 'Offer not found' });
  if (next === 'approved' || next === 'sent') await requireApproval(req, jobId, 'offer');
  if (next === 'sent' && latest.status !== 'approved') return res.status(409).json({ error: 'Approve the offer before sending it.' });
  const payload = transitionOffer(latest, next); const saved = await saveHiringState(tenantId(req), jobId, 'offer', payload, candidateId); res.json({ ...payload, state: saved, approval: await latestApproval(tenantId(req), jobId, 'offer') });
} catch (error: any) { res.status(400).json({ error: error?.message || 'Offer transition failed' }); } });

router.post('/engagement/plan', async (req, res) => { try { const jobId = String(req.body?.jobId || ''); if (!jobId) return res.status(400).json({ error: 'jobId is required' }); const offers = await listHiringStates(tenantId(req), jobId, 'offer'); const accepted = offers.find(x => x.payload?.status === 'accepted'); if (!accepted) return res.status(409).json({ error: 'Candidate must accept the offer before engagement planning.' }); const payload = buildEngagementPlan(String(req.body?.candidateName || 'Candidate')); const saved = await saveHiringState(tenantId(req), jobId, 'engagement', payload, req.body?.candidateId); res.json({ payload, state: saved }); } catch (error: any) { res.status(400).json({ error: error?.message || 'Engagement planning failed' }); } });
router.post('/onboarding/plan', async (req, res) => { try { const jobId = String(req.body?.jobId || ''); if (!jobId) return res.status(400).json({ error: 'jobId is required' }); const offers = await listHiringStates(tenantId(req), jobId, 'offer'); if (!offers.some(x => x.payload?.status === 'accepted')) return res.status(409).json({ error: 'Candidate must accept the offer before onboarding.' }); const payload = buildOnboardingPlan(req.body); const saved = await saveHiringState(tenantId(req), jobId, 'onboarding', payload, req.body?.candidateId); res.json({ payload, state: saved }); } catch (error: any) { res.status(400).json({ error: error?.message || 'Onboarding planning failed' }); } });
router.get('/jobs/:id/hiring-state', async (req, res) => { try { res.json({ states: await listHiringStates(tenantId(req), String(req.params.id)) }); } catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to load hiring state' }); } });

export default router;
