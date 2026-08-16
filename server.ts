import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import * as ics from 'ics';
import Stripe from 'stripe';
import { jsPDF } from 'jspdf';
import recruitingRouter from './services/recruiting/api.js';
import documentRouter from './services/recruiting/documentRoutes.js';
import { createControlPlaneRouter } from './services/recruiting/controlPlane.js';
import { requireWorkspaceAuth, authenticatedTenantId, workspaceSessionInfo } from './services/recruiting/firebaseAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    const requestId = String(req.header('x-request-id') || randomUUID());
    res.setHeader('x-request-id', requestId);
    const started = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api/')) console.log(JSON.stringify({ event: 'http_request', requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - started }));
    });
    next();
  });
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(self), microphone=(self)');
    next();
  });
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/recruiting/health', (_req, res) => {
    res.json({ ok: true, service: 'smartscout-recruiting', version: process.env.GITHUB_SHA || 'local' });
  });
  app.get('/api/recruiting/session', workspaceSessionInfo);

  const tenantId = (req: any) => authenticatedTenantId(req);
  app.use('/api/recruiting', requireWorkspaceAuth, recruitingRouter);
  app.use('/api/recruiting', requireWorkspaceAuth, documentRouter);
  app.use('/api/control-plane', requireWorkspaceAuth, createControlPlaneRouter(tenantId));

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

  app.post('/api/create-checkout-session', async (req, res) => {
    if (!stripe) return res.status(500).json({ error: 'Stripe is not configured' });
    const { priceId, userId, credits, packageName } = req.body;
    try {
      const session = await stripe.checkout.sessions.create({ payment_method_types: ['card'], line_items: [{ price: priceId, quantity: 1 }], mode: 'payment', success_url: `${req.headers.origin}/?payment=success&credits=${credits}&package=${encodeURIComponent(packageName)}`, cancel_url: `${req.headers.origin}/?payment=cancel`, metadata: { userId, credits: credits.toString(), packageName } });
      res.json({ id: session.id });
    } catch (err: any) { console.error('Stripe Session Error:', err); res.status(500).json({ error: err.message }); }
  });

  app.post('/api/send-report', async (req, res) => {
    const { recruiterEmail, candidateName, overallScore, status, reason, parameters = [], responses = [] } = req.body;
    if (!resend) return res.status(400).json({ success: false, error: 'RESEND_API_KEY is not configured.' });
    try {
      const doc = new jsPDF(); doc.setFontSize(22); doc.text('Interview Report', 20, 20); doc.setFontSize(14); doc.text(`Candidate: ${candidateName}`, 20, 35); doc.text(`Overall Score: ${overallScore}%`, 20, 45); doc.text(`Status: ${status}`, 20, 55); doc.setFontSize(16); doc.text('Executive Summary', 20, 70); doc.setFontSize(12);
      const splitReason = doc.splitTextToSize(String(reason || ''), 170); doc.text(splitReason, 20, 80); let y = 80 + splitReason.length * 7; doc.setFontSize(16); doc.text('Score Breakdown', 20, y + 10); doc.setFontSize(12); y += 20; parameters.forEach((p: any) => { doc.text(`${p.name}: ${p.score}%`, 20, y); y += 10; }); doc.setFontSize(16); doc.text('Q&A Transcript', 20, y + 10); doc.setFontSize(12); y += 20; responses.forEach((r: any, index: number) => { const q = doc.splitTextToSize(`Q${index + 1}: ${r.question}`, 170); doc.text(q, 20, y); y += q.length * 7; const a = doc.splitTextToSize(`A: ${r.answer}`, 170); doc.text(a, 20, y); y += a.length * 7 + 5; });
      const pdfBuffer = Buffer.from(doc.output('arraybuffer')); const { data, error } = await resend.emails.send({ from: 'SmartScout <reports@smartscout.online>', to: [recruiterEmail], subject: `Interview Report: ${candidateName} (${status} - ${overallScore}%)`, attachments: [{ filename: `${candidateName.replace(/\s+/g, '_')}_Report.pdf`, content: pdfBuffer }], html: `<h1>Interview Report</h1><p><strong>Candidate:</strong> ${candidateName}</p><p><strong>Overall Score:</strong> ${overallScore}%</p><p><strong>Status:</strong> ${status}</p><p>${String(reason || '')}</p>` });
      if (error) return res.status(500).json({ success: false, error: error.message }); res.json({ success: true, data });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.post('/api/send-invitation', async (req, res) => {
    const { candidateEmail, candidateName, designation, company, jd, emailBody, scheduledAt, interviewLink } = req.body;
    if (!resend) return res.status(400).json({ success: false, error: 'RESEND_API_KEY is not configured.' });
    try {
      const attachments: any[] = []; if (jd) attachments.push({ filename: 'job-description.txt', content: Buffer.from(jd) }); if (scheduledAt) { const date = new Date(scheduledAt); const event: ics.EventAttributes = { start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()], duration: { hours: 1 }, title: `AI Interview with ${company || 'SmartScout'}: ${candidateName} - ${designation || 'Position'}`, description: `Your AI-powered audio interview is scheduled.\n\nInterview Link: ${interviewLink}\n\n${emailBody}`, location: 'SmartScout AI Platform', url: interviewLink, status: 'CONFIRMED', busyStatus: 'BUSY', organizer: { name: 'SmartScout Recruitment', email: 'interviews@smartscout.online' }, attendees: [{ name: candidateName, email: candidateEmail, rsvp: true, partstat: 'ACCEPTED', role: 'REQ-PARTICIPANT' }] }; const { error, value } = ics.createEvent(event); if (!error && value) attachments.push({ filename: 'interview-invite.ics', content: Buffer.from(value) }); }
      const { data, error } = await resend.emails.send({ from: 'SmartScout <interviews@smartscout.online>', to: [candidateEmail], subject: `Interview Invitation: ${company || 'SmartScout'} - ${designation || 'Position'}`, attachments, html: `<h1>Interview Invitation</h1><div style="white-space:pre-wrap">${emailBody}</div>${scheduledAt ? `<p>Scheduled: ${new Date(scheduledAt).toLocaleString()}</p>` : ''}` });
      if (error) return res.status(500).json({ success: false, error: error.message }); res.json({ success: true, data });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  if (process.env.NODE_ENV !== 'production') { const { createServer: createViteServer } = await import('vite'); const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' }); app.use(vite.middlewares); }
  else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }}));
    app.get('*all', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: any, req: any, res: any, _next: any) => {
    const requestId = String(res.getHeader('x-request-id') || 'unknown');
    console.error(JSON.stringify({ event: 'unhandled_error', requestId, method: req.method, path: req.path, message: err?.message || 'Unknown error' }));
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal server error', requestId });
  });

  const server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  const shutdown = (signal: string) => { console.log(JSON.stringify({ event: 'shutdown', signal })); server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10000).unref(); };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}
startServer().catch(error => { console.error(error); process.exit(1); });
