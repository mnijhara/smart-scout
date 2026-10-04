import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { searchBrowserCandidates, type BrowserSource } from './browserSourcing.js';
import { listApprovals } from './controlPlane.js';
import { saveCandidates } from './candidateStore.js';

const router = Router();

async function requireJDApproval(tenantId: string, jobId: string) {
  const approvals = await listApprovals(tenantId, jobId);
  const approval = approvals.find((row: any) => row.action === 'jd_approval');
  if (!approval || approval.status !== 'approved') {
    throw new Error('Approve the JD before sourcing candidates.');
  }
}

async function handleBrowserSourceSearch(req: any, res: any) {
  try {
    const tenantId = String(req.header('x-tenant-id') || '');
    const jobId = String(req.body?.jobId || '');
    const source = String(req.body?.source || '') as BrowserSource;
    const query = String(req.body?.query || '').trim();
    const limit = Math.min(Math.max(Number(req.body?.limit) || 8, 1), 20);
    if (!tenantId) return res.status(400).json({ error: 'Workspace identity is missing' });
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });
    if (!['linkedin', 'naukri'].includes(source)) return res.status(400).json({ error: 'source must be linkedin or naukri' });
    if (!query) return res.status(400).json({ error: 'query is required' });
    const cookie = String(req.body?.cookie || req.body?.sessionCookie || '').trim();
    await requireJDApproval(tenantId, jobId);
    const candidates = await searchBrowserCandidates(tenantId, source, query, limit, cookie);
    const savedCandidates = await saveCandidates(tenantId, jobId, candidates);
    res.json({ jobId, source, query, candidates, savedCandidates });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Browser sourcing failed' });
  }
}

async function handleExtensionImport(req: any, res: any) {
  try {
    const tenantId = String(req.header('x-tenant-id') || req.body?.tenantId || '');
    const jobId = String(req.body?.jobId || '');
    const rawCandidates = req.body?.candidates;
    if (!tenantId) return res.status(400).json({ error: 'Workspace identity is missing' });
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });
    if (!Array.isArray(rawCandidates) || !rawCandidates.length) {
      return res.status(400).json({ error: 'No candidates provided for import' });
    }
    await requireJDApproval(tenantId, jobId);

    const normalizedCandidates = rawCandidates.map((c: any) => ({
      name: String(c.name || 'Candidate').trim(),
      headline: String(c.headline || 'Professional').trim(),
      location: String(c.location || 'India').trim(),
      profileUrl: String(c.profileUrl || c.profile_url || '').trim(),
      source: String(c.source || 'extension').trim(),
      summary: String(c.summary || '').trim(),
      evidence: Array.isArray(c.evidence) ? c.evidence : []
    }));

    const savedCandidates = await saveCandidates(tenantId, jobId, normalizedCandidates);
    res.json({ ok: true, jobId, imported: savedCandidates.length, candidates: savedCandidates });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Extension import failed' });
  }
}

// Keep the original public route and expose the normalized plural form used by production verification.
router.post('/browser-source/search', handleBrowserSourceSearch);
router.post('/browser-sourcing/search', handleBrowserSourceSearch);

// Extension ingestion endpoint
router.post('/extension/import', handleExtensionImport);

// Fetch candidates saved for a job
router.get('/candidates', async (req, res) => {
  try {
    const tenantId = String(req.header('x-tenant-id') || req.query?.tenantId || '');
    const jobId = String(req.query?.jobId || '');
    if (!tenantId) return res.status(400).json({ error: 'Workspace identity is missing' });
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });
    const { listCandidates } = await import('./candidateStore.js');
    const candidates = await listCandidates(tenantId, jobId);
    res.json({ jobId, candidates });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Failed to list candidates' });
  }
});

// Autonomous browser-use Talent Agent Sourcing
router.post('/browser-use/scout', async (req: any, res: any) => {
  try {
    const tenantId = String(req.header('x-tenant-id') || '');
    const jobId = String(req.body?.jobId || '');
    const roleTitle = String(req.body?.roleTitle || '').trim();
    const location = String(req.body?.location || 'Gurgaon').trim();
    const companies = Array.isArray(req.body?.companies) ? req.body.companies : undefined;
    const mustHaves = Array.isArray(req.body?.mustHaves) ? req.body.mustHaves : undefined;
    const limit = Math.min(Math.max(Number(req.body?.limit) || 6, 1), 15);

    if (!tenantId) return res.status(400).json({ error: 'Workspace identity is missing' });
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });
    if (!roleTitle) return res.status(400).json({ error: 'roleTitle is required' });

    await requireJDApproval(tenantId, jobId);

    const { runBrowserUseAgent } = await import('./browserUseAgent.js');
    const { getAICredential, listAIProviders } = await import('./credentialStore.js');

    let aiConfig: any = undefined;
    if (process.env.GEMINI_API_KEY) {
      aiConfig = { provider: 'gemini', apiKey: process.env.GEMINI_API_KEY, model: 'gemini-3.6-flash' };
    } else {
      const providers = await listAIProviders(tenantId).catch(() => []);
      if (providers[0]) {
        const apiKey = await getAICredential(tenantId, providers[0]);
        if (apiKey) aiConfig = { provider: providers[0], apiKey };
      }
    }

    const discovered = await runBrowserUseAgent({ roleTitle, location, companies, mustHaves, limit }, aiConfig);
    const savedCandidates = await saveCandidates(tenantId, jobId, discovered);

    res.json({ ok: true, jobId, count: savedCandidates.length, candidates: savedCandidates });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Autonomous browser agent sourcing failed' });
  }
});

// Crawlee Production Market & Comp Intelligence
router.get('/crawlee/market-benchmark', async (req: any, res: any) => {
  try {
    const tenantId = String(req.header('x-tenant-id') || req.query?.tenantId || '');
    const role = String(req.query?.role || 'VP HR').trim();
    const location = String(req.query?.location || 'Gurgaon').trim();

    const { crawlMarketIntelligence } = await import('./crawleeIntelligence.js');
    const { getAICredential, listAIProviders } = await import('./credentialStore.js');

    let aiConfig: any = undefined;
    if (process.env.GEMINI_API_KEY) {
      aiConfig = { provider: 'gemini', apiKey: process.env.GEMINI_API_KEY, model: 'gemini-3.6-flash' };
    } else if (tenantId) {
      const providers = await listAIProviders(tenantId).catch(() => []);
      if (providers[0]) {
        const apiKey = await getAICredential(tenantId, providers[0]);
        if (apiKey) aiConfig = { provider: providers[0], apiKey };
      }
    }

    const benchmark = await crawlMarketIntelligence(role, location, aiConfig);
    res.json({ ok: true, benchmark });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Crawlee market benchmark failed' });
  }
});

// Direct extension bundle download
router.get('/extension/download', (req, res) => {
  const zipPath = path.join(process.cwd(), 'public', 'extension', 'smartscout-extension.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'smartscout-extension.zip');
  } else {
    res.status(404).json({ error: 'Extension package not found' });
  }
});

export default router;
