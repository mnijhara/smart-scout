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
