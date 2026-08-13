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

const router = Router();
type SessionCredential = { provider: AIProvider; apiKey: string; model?: string };
const sessions = new Map<string, SessionCredential>();

function tenantId(req: any): string { return String(req.header('x-tenant-id') || 'demo-tenant'); }

async function getCredential(req: any): Promise<SessionCredential> {
  const tenant = tenantId(req);
  const session = sessions.get(tenant);
  if (session) return session;

  if (process.env.GEMINI_API_KEY) {
    const credential: SessionCredential = { provider: 'gemini', apiKey: process.env.GEMINI_API_KEY, model: 'gemini-3.6-flash' };
    sessions.set(tenant, credential);
    return credential;
  }

  const providers = await listAIProviders(tenant).catch(() => [] as AIProvider[]);
  const provider = providers[0];
  if (provider) {
    const apiKey = await getAICredential(tenant, provider);
    if (apiKey) {
      const credential: SessionCredential = { provider, apiKey, model: provider === 'gemini' ? 'gemini-3.6-flash' : undefined };
      sessions.set(tenant, credential);
      return credential;
    }
  }
  throw new Error('Connect an AI provider first');
}

async function validateCredential(provider: AIProvider, apiKey: string, model?: string) {
  await generateAI({ provider, apiKey, model: model || (provider === 'gemini' ? 'gemini-3.6-flash' : undefined), system: 'You are a connectivity check. Reply with OK only.', prompt: 'OK', temperature: 0, maxTokens: 8 });
}

router.get('/health', (_req, res) => res.json({ ok: true, service: 'recruiting-os' }));

router.post('/ai/connect', async (req, res) => {
  try {
    const { provider, apiKey, model } = req.body || {};
    if (!['gemini', 'openai', 'anthropic'].includes(provider)) return res.status(400).json({ error: 'Unsupported provider' });
    const secret = String(apiKey || '').trim();
    if (secret.length < 8) return res.status(400).json({ error: 'API key is required' });
    const selectedModel = model || (provider === 'gemini' ? 'gemini-3.6-flash' : undefined);
    await validateCredential(provider as AIProvider, secret, selectedModel);
    const tenant = tenantId(req);
    sessions.set(tenant, { provider: provider as AIProvider, apiKey: secret, model: selectedModel });
    let persistent = false;
    try { await saveAICredential(tenant, provider as AIProvider, secret); persistent = true; }
    catch (persistenceError: any) { console.warn('AI credential persistence unavailable:', persistenceError?.message || persistenceError); }
    res.json({ connected: true, provider, model: selectedModel, persistent, masked: `${secret.slice(0, 4)}••••${secret.slice(-4)}` });
  } catch (error: any) { res.status(400).json({ error: error?.message || 'Unable to connect AI provider' }); }
});

router.get('/ai/status', async (req, res) => {
  try {
    const tenant = tenantId(req);
    const session = sessions.get(tenant);
    if (session) return res.json({ connected: true, provider: session.provider, model: session.model });
    const providers = await listAIProviders(tenant).catch(() => [] as AIProvider[]);
    if (providers.length) return res.json({ connected: true, provider: providers[0], model: providers[0] === 'gemini' ? 'gemini-3.6-flash' : null });
    if (process.env.GEMINI_API_KEY) return res.json({ connected: true, provider: 'gemini', model: 'gemini-3.6-flash', source: 'environment' });
    return res.json({ connected: false, provider: null, model: null });
  } catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to read AI status' }); }
});

router.delete('/ai/disconnect', async (req, res) => {
  const tenant = tenantId(req); const session = sessions.get(tenant); sessions.delete(tenant);
  if (session) { try { await deleteAICredential(tenant, session.provider); } catch (error: any) { console.warn('AI credential delete unavailable:', error?.message || error); } }
  res.json({ connected: false });
});

router.post('/jd/analyze', async (req, res) => {
  try { const { text } = req.body || {}; if (!text?.trim()) return res.status(400).json({ error: 'Job description text is required' }); const c = await getCredential(req); res.json(await analyzeJD(text, c.provider, c.apiKey, c.model)); }
  catch (error: any) { res.status(400).json({ error: error?.message || 'JD analysis failed' }); }
});
router.post('/source/search', async (req, res) => {
  try { const c = await getCredential(req); if (c.provider !== 'gemini') return res.status(400).json({ error: 'Candidate web sourcing currently requires Gemini' }); res.json({ candidates: await searchWebCandidates(c.apiKey, req.body?.role, Number(req.body?.limit) || 8) }); }
  catch (error: any) { res.status(400).json({ error: error?.message || 'Candidate sourcing failed' }); }
});
router.post('/candidate/score', async (req, res) => {
  try { const { candidate, requirement } = req.body || {}; if (!candidate || !requirement) return res.status(400).json({ error: 'candidate and requirement are required' }); const c = await getCredential(req); res.json(await scoreCandidate(candidate, requirement, c.provider, c.apiKey, c.model)); }
  catch (error: any) { res.status(400).json({ error: error?.message || 'Candidate scoring failed' }); }
});
router.post('/interview/plan', (req, res) => res.json(buildInterviewPlan(String(req.body?.role || 'the role'), Array.isArray(req.body?.competencies) ? req.body.competencies : [])));
router.post('/decision', (req, res) => { try { res.json(makeHiringDecision(req.body)); } catch (error: any) { res.status(400).json({ error: error?.message || 'Decision failed' }); } });
router.post('/compensation/recommend', (req, res) => { try { res.json(recommendCompensation(req.body?.observations || [], req.body?.internalComparable)); } catch (error: any) { res.status(400).json({ error: error?.message || 'Compensation analysis failed' }); } });
router.post('/offer/draft', (req, res) => { try { res.json(createOffer(req.body)); } catch (error: any) { res.status(400).json({ error: error?.message || 'Offer draft failed' }); } });
router.post('/engagement/plan', (req, res) => res.json(buildEngagementPlan(String(req.body?.candidateName || 'there'))));
router.post('/onboarding/plan', (req, res) => res.json(buildOnboardingPlan(req.body || {})));
export default router;
