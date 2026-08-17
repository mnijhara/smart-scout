import { Router } from 'express';
import { extractDocumentText } from './documentIngestion.js';
import { saveRecruitingDocument } from './documentStore.js';

const router = Router();

router.post('/candidate/ingest-document', async (req, res) => {
  try {
    const filename = String(req.body?.filename || 'document').trim().slice(0, 200);
    const mimeType = String(req.body?.mimeType || 'application/octet-stream').trim().toLowerCase();
    const encoded = String(req.body?.dataBase64 || '').trim();
    const tenantId = String(req.header('x-tenant-id') || '').trim();
    if (!tenantId) return res.status(401).json({ error: 'Workspace identity is missing' });
    if (!encoded) return res.status(400).json({ error: 'dataBase64 is required' });
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) return res.status(400).json({ error: 'dataBase64 is invalid' });
    const data = Buffer.from(encoded, 'base64');
    if (!data.length) return res.status(400).json({ error: 'Document is empty' });
    if (data.length > 15 * 1024 * 1024) return res.status(413).json({ error: 'Document exceeds the 15 MB ingestion limit' });
    const document = await extractDocumentText({ filename, mimeType, data });
    if (!document.text.trim()) return res.status(422).json({ error: 'No readable text was found in the document' });
    if (document.text.length > 2_000_000) return res.status(413).json({ error: 'Extracted document text is too large' });
    const persisted = await saveRecruitingDocument({ tenantId, jobId: req.body?.jobId ? String(req.body.jobId).trim() : undefined, candidateId: req.body?.candidateId ? String(req.body.candidateId).trim() : undefined, filename: document.filename, mimeType: document.mimeType, extractedText: document.text });
    res.json({ ...document, persisted });
  } catch (error: any) { res.status(400).json({ error: error?.message || 'Document ingestion failed' }); }
});

export default router;
