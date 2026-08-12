const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const INDEX = path.join(DIST, 'index.html');

// Hostinger may start the configured entry file without running the frontend
// build command first. Ensure the Vite production bundle exists before serving.
if (!fs.existsSync(INDEX)) {
  console.log('Production bundle not found; building with Vite...');
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
}

if (!fs.existsSync(INDEX)) {
  throw new Error(`Vite build completed but ${INDEX} was not created.`);
}

app.use(express.json({ limit: '50mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'smartscout' });
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const Stripe = require('stripe');
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'Stripe is not configured' });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { priceId, userId, credits, packageName } = req.body;
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${origin}/?payment=success&credits=${credits}&package=${encodeURIComponent(packageName || '')}`,
      cancel_url: `${origin}/?payment=cancel`,
      metadata: { userId, credits: String(credits ?? ''), packageName: packageName || '' },
    });
    res.json({ id: session.id });
  } catch (err) {
    console.error('Stripe Session Error:', err);
    res.status(500).json({ error: err.message || 'Unable to create checkout session' });
  }
});

app.post('/api/send-report', async (req, res) => {
  try {
    const { Resend } = require('resend');
    const { jsPDF } = require('jspdf');
    if (!process.env.RESEND_API_KEY) return res.status(400).json({ success: false, error: 'RESEND_API_KEY is not configured' });
    const { recruiterEmail, candidateName, overallScore, status, reason, parameters = [], responses = [] } = req.body;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const doc = new jsPDF();
    doc.setFontSize(22); doc.text('Interview Report', 20, 20);
    doc.setFontSize(14); doc.text(`Candidate: ${candidateName || ''}`, 20, 35); doc.text(`Overall Score: ${overallScore ?? ''}%`, 20, 45); doc.text(`Status: ${status || ''}`, 20, 55);
    doc.setFontSize(16); doc.text('Executive Summary', 20, 70); doc.setFontSize(12);
    const splitReason = doc.splitTextToSize(reason || '', 170); doc.text(splitReason, 20, 80);
    let y = 80 + splitReason.length * 7; doc.setFontSize(16); doc.text('Score Breakdown', 20, y + 10); doc.setFontSize(12); y += 20;
    parameters.forEach((p) => { doc.text(`${p.name}: ${p.score}%`, 20, y); y += 10; });
    doc.setFontSize(16); doc.text('Q&A Transcript', 20, y + 10); doc.setFontSize(12); y += 20;
    responses.forEach((r, index) => { const q = doc.splitTextToSize(`Q${index + 1}: ${r.question || ''}`, 170); doc.text(q, 20, y); y += q.length * 7; const a = doc.splitTextToSize(`A: ${r.answer || ''}`, 170); doc.text(a, 20, y); y += a.length * 7 + 5; });
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const result = await resend.emails.send({ from: 'SmartScout <reports@smartscout.online>', to: [recruiterEmail], subject: `Interview Report: ${candidateName} (${status} - ${overallScore}%)`, attachments: [{ filename: `${String(candidateName || 'candidate').replace(/\s+/g, '_')}_Report.pdf`, content: pdfBuffer }], html: `<div style="font-family:sans-serif"><h1>Interview Report</h1><p><b>Candidate:</b> ${candidateName || ''}</p><p><b>Overall Score:</b> ${overallScore || ''}%</p><p><b>Status:</b> ${status || ''}</p><p>${reason || ''}</p></div>` });
    if (result.error) return res.status(500).json({ success: false, error: result.error.message });
    res.json({ success: true, data: result.data });
  } catch (err) { console.error('Report error:', err); res.status(500).json({ success: false, error: err.message || 'Failed to send report' }); }
});

app.post('/api/send-invitation', async (req, res) => {
  try {
    const { Resend } = require('resend'); const ics = require('ics');
    if (!process.env.RESEND_API_KEY) return res.status(400).json({ success: false, error: 'RESEND_API_KEY is not configured' });
    const { candidateEmail, candidateName, designation, company, jd, emailBody, scheduledAt, interviewLink } = req.body;
    const resend = new Resend(process.env.RESEND_API_KEY); const attachments = [];
    if (jd) attachments.push({ filename: 'job-description.txt', content: Buffer.from(jd) });
    if (scheduledAt) { const date = new Date(scheduledAt); const event = { start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()], duration: { hours: 1, minutes: 0 }, title: `AI Interview with ${company || 'SmartScout'}: ${candidateName} - ${designation || 'Position'}`, description: `Your AI-powered audio interview for the ${designation || 'position'} at ${company || 'our company'} is scheduled.\n\nInterview Link: ${interviewLink}\n\n${emailBody || ''}`, location: 'SmartScout AI Platform', url: interviewLink, status: 'CONFIRMED', busyStatus: 'BUSY', organizer: { name: 'SmartScout Recruitment', email: 'interviews@smartscout.online' }, attendees: [{ name: candidateName, email: candidateEmail, rsvp: true, partstat: 'ACCEPTED', role: 'REQ-PARTICIPANT' }] }; const created = ics.createEvent(event); if (!created.error && created.value) attachments.push({ filename: 'interview-invite.ics', content: Buffer.from(created.value) }); }
    const result = await resend.emails.send({ from: 'SmartScout <interviews@smartscout.online>', to: [candidateEmail], subject: `Interview Invitation: ${company || 'SmartScout'} - ${designation || 'Position'}`, attachments, html: `<div style="font-family:sans-serif;max-width:600px"><h1>Interview Invitation</h1><div style="white-space:pre-wrap">${emailBody || ''}</div>${scheduledAt ? `<p>Scheduled Time: ${new Date(scheduledAt).toLocaleString()}</p>` : ''}<p>Best regards,<br>Smart Scout Recruitment Team</p></div>` });
    if (result.error) return res.status(500).json({ success: false, error: result.error.message }); res.json({ success: true, data: result.data });
  } catch (err) { console.error('Invitation error:', err); res.status(500).json({ success: false, error: err.message || 'Failed to send invitation' }); }
});

app.use(express.static(DIST));
app.get('*all', (_req, res) => res.sendFile(INDEX));

app.listen(PORT, '0.0.0.0', () => console.log(`Smart Scout server running on 0.0.0.0:${PORT}`));
