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
import browserSourceRouter from './services/recruiting/browserSourceRoutes.js';
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
  app.use('/api/recruiting', requireWorkspaceAuth, browserSourceRouter);
  app.use('/api/control-plane', requireWorkspaceAuth, createControlPlaneRouter(tenantId));

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

  app.post('/api/create-checkout-session', requireWorkspaceAuth, async (req, res) => {
    if (!stripe) return res.status(500).json({ error: 'Stripe is not configured' });
    const { priceId, credits, packageName } = req.body || {};
    const normalizedPriceId = String(priceId || '').trim();
    const normalizedCredits = Number(credits);
    const normalizedPackage = String(packageName || '').trim().slice(0, 100);
    if (!normalizedPriceId || !Number.isFinite(normalizedCredits) || normalizedCredits <= 0 || normalizedCredits > 100000 || !normalizedPackage) {
      return res.status(400).json({ error: 'Valid priceId, credits and packageName are required' });
    }
    const origin = String(req.headers.origin || '').replace(/\/$/, '');
    const allowedOrigin = process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL.replace(/\/$/, '') : origin;
    if (!allowedOrigin || !/^https?:\/\//i.test(allowedOrigin)) return res.status(400).json({ error: 'A valid application origin is required' });
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: normalizedPriceId, quantity: 1 }],
        mode: 'payment',
        success_url: `${allowedOrigin}/?payment=success`,
        cancel_url: `${allowedOrigin}/?payment=cancel`,
        metadata: { tenantId: tenantId(req), credits: String(normalizedCredits), packageName: normalizedPackage },
      });
      res.json({ id: session.id });
    } catch (err: any) { console.error('Stripe Session Error:', err); res.status(500).json({ error: err.message }); }
  });

  app.post('/api/send-report', requireWorkspaceAuth, async (req, res) => {
    const { recruiterEmail, candidateName, overallScore, status, reason, parameters = [], responses = [] } = req.body || {};
    if (!resend) return res.status(400).json({ success: false, error: 'RESEND_API_KEY is not configured.' });
    if (!String(recruiterEmail || '').trim() || !String(candidateName || '').trim()) return res.status(400).json({ success: false, error: 'recruiterEmail and candidateName are required.' });
    try {
      const doc = new jsPDF(); doc.setFontSize(22); doc.text('Interview Report', 20, 20); doc.setFontSize(14); doc.text(`Candidate: ${candidateName}`, 20, 35); doc.text(`Overall Score: ${overallScore}%`, 20, 45); doc.text(`Status: ${status}`, 20, 55); doc.setFontSize(16); doc.text('Executive Summary', 20, 70); doc.setFontSize(12);
      const splitReason = doc.splitTextToSize(String(reason || ''), 170); doc.text(splitReason, 20, 80); let y = 80 + splitReason.length * 7; doc.setFontSize(16); doc.text('Score Breakdown', 20, y + 10); doc.setFontSize(12); y += 20; parameters.slice(0, 30).forEach((p: any) => { doc.text(`${String(p.name || '').slice(0, 80)}: ${Number(p.score) || 0}%`, 20, y); y += 10; if (y > 270) { doc.addPage(); y = 20; } }); doc.setFontSize(16); doc.text('Q&A Transcript', 20, y + 10); doc.setFontSize(12); y += 20; responses.slice(0, 100).forEach((r: any, index: number) => { const q = doc.splitTextToSize(`Q${index + 1}: ${String(r.question || '')}`, 170); doc.text(q, 20, y); y += q.length * 7; const a = doc.splitTextToSize(`A: ${String(r.answer || '')}`, 170); doc.text(a, 20, y); y += a.length * 7 + 5; if (y > 270) { doc.addPage(); y = 20; } });
      const pdfBuffer = Buffer.from(doc.output('arraybuffer')); const { data, error } = await resend.emails.send({ from: 'SmartScout <reports@smartscout.online>', to: [String(recruiterEmail).trim()], subject: `Interview Report: ${String(candidateName).slice(0, 120)} (${status} - ${overallScore}%)`, attachments: [{ filename: `${String(candidateName).replace(/\s+/g, '_').slice(0, 80)}_Report.pdf`, content: pdfBuffer }], html: `<h1>Interview Report</h1><p><strong>Candidate:</strong> ${String(candidateName)}</p><p><strong>Overall Score:</strong> ${overallScore}%</p><p><strong>Status:</strong> ${String(status || '')}</p><p>${String(reason || '')}</p>` });
      if (error) return res.status(500).json({ success: false, error: error.message }); res.json({ success: true, data });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.post('/api/send-invitation', requireWorkspaceAuth, async (req, res) => {
    const { candidateEmail, candidateName, designation, company, jd, emailBody, scheduledAt, interviewLink } = req.body || {};
    if (!resend) return res.status(400).json({ success: false, error: 'RESEND_API_KEY is not configured.' });
    if (!String(candidateEmail || '').trim() || !String(candidateName || '').trim()) return res.status(400).json({ success: false, error: 'candidateEmail and candidateName are required.' });
    try {
      const attachments: any[] = []; if (jd) attachments.push({ filename: 'job-description.txt', content: Buffer.from(String(jd).slice(0, 200000)) }); if (scheduledAt) { const date = new Date(scheduledAt); if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, error: 'scheduledAt is invalid' }); const event: ics.EventAttributes = { start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()], duration: { hours: 1 }, title: `AI Interview with ${String(company || 'SmartScout').slice(0, 100)}: ${String(candidateName).slice(0, 100)} - ${String(designation || 'Position').slice(0, 100)}`, description: `Your AI-powered audio interview is scheduled.\n\nInterview Link: ${String(interviewLink || '')}\n\n${String(emailBody || '')}`, location: 'SmartScout AI Platform', url: interviewLink, status: 'CONFIRMED', busyStatus: 'BUSY', organizer: { name: 'SmartScout Recruitment', email: 'interviews@smartscout.online' }, attendees: [{ name: String(candidateName), email: String(candidateEmail), rsvp: true, partstat: 'ACCEPTED', role: 'REQ-PARTICIPANT' }] }; const { error, value } = ics.createEvent(event); if (!error && value) attachments.push({ filename: 'interview-invite.ics', content: Buffer.from(value) }); }
      const { data, error } = await resend.emails.send({ from: 'SmartScout <interviews@smartscout.online>', to: [String(candidateEmail).trim()], subject: `Interview Invitation: ${String(company || 'SmartScout').slice(0, 100)} - ${String(designation || 'Position').slice(0, 100)}`, attachments, html: `<h1>Interview Invitation</h1><div style="white-space:pre-wrap">${String(emailBody || '')}</div>${scheduledAt ? `<p>Scheduled: ${new Date(scheduledAt).toLocaleString()}</p>` : ''}` });
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