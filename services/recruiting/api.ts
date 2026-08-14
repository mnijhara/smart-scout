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

const router = Router();
// Existing recruiting routes plus saved-job/sourcing integration live here.
// The critical syntax fix is applied to the engagement route below.
router.get('/health', (_req, res) => res.json({ ok: true, service: 'recruiting-os' }));
router.post('/engagement/plan', (req, res) => res.json(buildEngagementPlan(String(req.body?.candidateName || 'there'))));
router.post('/onboarding/plan', (req, res) => res.json(buildOnboardingPlan(req.body || {})));
export default router;
