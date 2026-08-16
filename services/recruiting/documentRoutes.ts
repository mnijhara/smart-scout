import { Router } from 'express';
import { extractDocumentText } from './documentIngestion.js';
import { saveRecruitingDocument } from './documentStore.js';
import { searchBrowserCandidates, type BrowserSource } from './browserSourcing.js';

const router = Router();

router.post('/candidate/ingest-document', async (req, res) => {
  try {
    const filename = String(req.body?.filename || 'document');
    const mimeType = String(req.body?.mimeType || 'application/octet-stream');
    const encoded = String(req.body?.dataBase64 || '');
    if (!encoded) return res.status(400).json({ error: 'dataBase64 is required' });
    const data = Buffer.from(encoded, 'base64');
    if (data.length > 15 * 1024 * 1024) return res.status(413).json({ error: 'Document exceeds the 15 MB ingestion limit' });
    const document = await extractDocumentText({ filename, mimeType, data });
    const persisted = await saveRecruitingDocument({ tenantId: String(req.header('x-tenant-id') || ''), jobId: req.body?.jobId ? String(req.body.jobId) : undefined, candidateId: req.body?.candidateId ? String(req.body.candidateId) : undefined, filename: document.filename, mimeType: document.mimeType, extractedText: document.text });
    res.json({ ...document, persisted });
  } catch (error: any) { res.status(400).json({ error: error?.message || 'Document ingestion failed' }); }
});

// Browser-assisted LinkedIn/Naukri sourcing. Uses a persistent workspace profile so
// the recruiter can sign in normally once. It does not bypass CAPTCHA or access controls.
router.post('/browser-sourcing/search', async (req, res) => {
  try {
    const source = String(req.body?.source || '') as BrowserSource;
    const query = String(req.body?.query || '').trim();
    const limit = Math.min(Math.max(Number(req.body?.limit) || 8, 1), 25);
    if (!['linkedin', 'naukri'].includes(source)) return res.status(400).json({ error: 'source must be linkedin or naukri' });
    if (!query) return res.status(400).json({ error: 'query is required' });
    const candidates = await searchBrowserCandidates(String(req.header('x-tenant-id') || ''), source, query, limit);
    res.json({ source, query, candidates });
  } catch (error: any) { res.status(400).json({ error: error?.message || 'Browser sourcing failed' }); }
});

export default router;
