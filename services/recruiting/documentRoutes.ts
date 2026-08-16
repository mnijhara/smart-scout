import { Router } from 'express';
import { extractDocumentText } from './documentIngestion.js';
import { saveRecruitingDocument } from './documentStore.js';

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
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Document ingestion failed' });
  }
});

export default router;
