import { Router } from 'express';
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

router.post('/browser-source/search', async (req, res) => {
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
    await requireJDApproval(tenantId, jobId);
    const candidates = await searchBrowserCandidates(tenantId, source, query, limit);
    const savedCandidates = await saveCandidates(tenantId, jobId, candidates);
    res.json({ jobId, source, query, candidates, savedCandidates });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Browser sourcing failed' });
  }
});

export default router;
