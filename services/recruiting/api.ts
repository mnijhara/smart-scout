import { Router } from 'express';
import { analyzeJD } from './jdAgent';
import { scoreCandidate } from './candidateScoring';
import { buildInterviewPlan } from './interview';
import { makeHiringDecision } from './decision';
import { recommendCompensation } from './compensation';
import { createOffer, buildEngagementPlan, buildOnboardingPlan } from './lifecycle';
import type { AIProvider } from './aiGateway';

const router = Router();
const credentials = new Map<string, { provider: AIProvider; apiKey: string; model?: string }>();

function tenantId(req: any): string { return String(req.header('x-tenant-id') || 'demo-tenant'); }
function getCredential(req: any) {
  const credential = credentials.get(tenantId(req));
  if (!credential) throw new Error('Connect an AI provider first');
  return credential;
}

router.get('/health', (_req, res) => res.json({ ok: true, service: 'recruiting-os' }));

router.post('/ai/connect', async (req, res) => {
  try {
    const { provider, apiKey, model } = req.body || {};
    if (!['gemini', 'openai', 'anthropic'].includes(provider)) return res.status(400).json({ error: 'Unsupported provider' });
    if (!apiKey || String(apiKey).length < 8) return res.status(400).json({ error: 'API key is required' });
    credentials.set(tenantId(req), { provider, apiKey: String(apiKey), model });
    res.json({ connected: true, provider, masked: `${String(apiKey).slice(0, 4)}••••${String(apiKey).slice(-4)}` });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.get('/ai/status', (req, res) => {
  const c = credentials.get(tenantId(req));
  res.json({ connected: !!c, provider: c?.provider || null, model: c?.model || null });
});

router.delete('/ai/disconnect', (req, res) => { credentials.delete(tenantId(req)); res.json({ connected: false }); });

router.post('/jd/analyze', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text?.trim()) return res.status(400).json({ error: 'Job description text is required' });
    const c = getCredential(req);
    res.json(await analyzeJD(text, c.provider, c.apiKey, c.model));
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.post('/candidate/score', async (req, res) => {
  try {
    const { candidate, requirement } = req.body || {};
    if (!candidate || !requirement) return res.status(400).json({ error: 'candidate and requirement are required' });
    const c = getCredential(req);
    res.json(await scoreCandidate(candidate, requirement, c.provider, c.apiKey, c.model));
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.post('/interview/plan', (req, res) => {
  const { role, competencies } = req.body || {};
  res.json(buildInterviewPlan(String(role || 'the role'), Array.isArray(competencies) ? competencies : []));
});

router.post('/decision', (req, res) => {
  try { res.json(makeHiringDecision(req.body)); } catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.post('/compensation/recommend', (req, res) => {
  try { res.json(recommendCompensation(req.body?.observations || [], req.body?.internalComparable)); } catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.post('/offer/draft', (req, res) => {
  try { res.json(createOffer(req.body)); } catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.post('/engagement/plan', (req, res) => res.json(buildEngagementPlan(String(req.body?.candidateName || 'there'))));

router.post('/onboarding/plan', (req, res) => res.json(buildOnboardingPlan(req.body || {})));

export default router;
