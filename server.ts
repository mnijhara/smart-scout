import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import * as ics from 'ics';
import Stripe from 'stripe';
import { jsPDF } from 'jspdf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

  // Stripe Checkout Session
  app.post('/api/create-checkout-session', async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    const { priceId, userId, credits, packageName } = req.body;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/?payment=success&credits=${credits}&package=${encodeURIComponent(packageName)}`,
        cancel_url: `${req.headers.origin}/?payment=cancel`,
        metadata: {
          userId,
          credits: credits.toString(),
          packageName,
        },
      });

      res.json({ id: session.id });
    } catch (err: any) {
      console.error('Stripe Session Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route to send interview report
  app.post('/api/send-report', async (req, res) => {
    const { recruiterEmail, candidateName, overallScore, status, reason, parameters, responses, emailBody } = req.body;

    if (!resend) {
      console.warn('RESEND_API_KEY not found. Skipping email sending.');
      return res.status(400).json({ 
        success: false, 
        error: 'RESEND_API_KEY is not configured. Please add it to your environment variables to enable real email sending.' 
      });
    }

    try {
      // Generate PDF
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text('Interview Report', 20, 20);
      
      doc.setFontSize(14);
      doc.text(`Candidate: ${candidateName}`, 20, 35);
      doc.text(`Overall Score: ${overallScore}%`, 20, 45);
      doc.text(`Status: ${status}`, 20, 55);
      
      doc.setFontSize(16);
      doc.text('Executive Summary', 20, 70);
      doc.setFontSize(12);
      const splitReason = doc.splitTextToSize(reason, 170);
      doc.text(splitReason, 20, 80);
      
      let y = 80 + (splitReason.length * 7);
      
      doc.setFontSize(16);
      doc.text('Score Breakdown', 20, y + 10);
      doc.setFontSize(12);
      y += 20;
      parameters.forEach((p: any) => {
        doc.text(`${p.name}: ${p.score}%`, 20, y);
        y += 10;
      });
      
      doc.setFontSize(16);
      doc.text('Q&A Transcript', 20, y + 10);
      doc.setFontSize(12);
      y += 20;
      responses.forEach((r: any, index: number) => {
        const splitQuestion = doc.splitTextToSize(`Q${index + 1}: ${r.question}`, 170);
        doc.text(splitQuestion, 20, y);
        y += (splitQuestion.length * 7);
        const splitAnswer = doc.splitTextToSize(`A: ${r.answer}`, 170);
        doc.text(splitAnswer, 20, y);
        y += (splitAnswer.length * 7) + 5;
      });
      
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      const { data, error } = await resend.emails.send({
        from: 'SmartScout <reports@smartscout.online>',
        to: [recruiterEmail],
        subject: `Interview Report: ${candidateName} (${status} - ${overallScore}%)`,
        attachments: [
          {
            filename: `${candidateName.replace(/\s+/g, '_')}_Report.pdf`,
            content: pdfBuffer,
          }
        ],
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
            <h1 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">Interview Report</h1>
            
            <div style="margin-top: 20px;">
              <p><strong>Candidate:</strong> ${candidateName}</p>
              <p><strong>Overall Score:</strong> ${overallScore}%</p>
              <p><strong>Status:</strong> <span style="color: ${status === 'Selected' ? '#10b981' : '#ef4444'}; font-weight: bold;">${status}</span></p>
            </div>

            <div style="margin-top: 20px; background-color: #f8fafc; padding: 15px; border-radius: 8px;">
              <h3 style="margin-top: 0;">Executive Summary</h3>
              <p style="font-style: italic; color: #475569;">"${reason}"</p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: left;">
              <p>Please find the detailed interview report attached as a PDF.</p>
            </div>

            <div style="margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center;">
              Sent via SmartScout AI Recruitment Platform
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('Resend error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      res.json({ success: true, data });
    } catch (err: any) {
      console.error('Failed to send email:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route to send interview invitation to candidate
  app.post('/api/send-invitation', async (req, res) => {
    const { candidateEmail, candidateName, designation, company, jd, emailBody, scheduledAt, interviewLink } = req.body;

    if (!resend) {
      console.warn('RESEND_API_KEY not found. Skipping email sending.');
      return res.status(400).json({ 
        success: false, 
        error: 'RESEND_API_KEY is not configured. Please add it to your environment variables to enable real email sending.' 
      });
    }

    try {
      const attachments: any[] = [];
      
      if (jd) {
        attachments.push({
          filename: 'job-description.txt',
          content: Buffer.from(jd),
        });
      }
      
      if (scheduledAt) {
        const date = new Date(scheduledAt);
        const event: ics.EventAttributes = {
          start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()],
          duration: { hours: 1, minutes: 0 },
          title: `AI Interview with ${company || 'SmartScout'}: ${candidateName} - ${designation || 'Position'}`,
          description: `Your AI-powered audio interview for the ${designation || 'position'} at ${company || 'our company'} is scheduled. \n\nInterview Link: ${interviewLink}\n\n${emailBody}`,
          location: 'SmartScout AI Platform',
          url: interviewLink,
          status: 'CONFIRMED',
          busyStatus: 'BUSY',
          organizer: { name: 'SmartScout Recruitment', email: 'interviews@smartscout.online' },
          attendees: [
            { name: candidateName, email: candidateEmail, rsvp: true, partstat: 'ACCEPTED', role: 'REQ-PARTICIPANT' }
          ]
        };

        const { error, value } = ics.createEvent(event);
        if (!error && value) {
          attachments.push({
            filename: 'interview-invite.ics',
            content: Buffer.from(value),
          });
        } else if (error) {
          console.error('ICS generation error:', error);
        }
      }

      const { data, error } = await resend.emails.send({
        from: 'SmartScout <interviews@smartscout.online>',
        to: [candidateEmail],
        subject: `Interview Invitation: ${company || 'SmartScout'} - ${designation || 'Position'}`,
        attachments,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; text-align: left;">
            <h1 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; text-align: left;">Interview Invitation</h1>
            
            <div style="margin-top: 20px; white-space: pre-wrap; color: #334155; line-height: 1.6; text-align: left;">${emailBody}</div>

            ${scheduledAt ? `
              <div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
                <p style="margin: 0; font-weight: bold; color: #0369a1;">Scheduled Time:</p>
                <p style="margin: 5px 0 0 0; color: #0c4a6e;">${new Date(scheduledAt).toLocaleString()}</p>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #0369a1;">A calendar invite and job description are attached to this email.</p>
              </div>
            ` : ''}
            
            <p style="margin-top: 20px;">Best regards,<br>Smart Scout Recruitment Team</p>
          </div>
        `,
      });

      if (error) {
        console.error('Resend error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      res.json({ success: true, data });
    } catch (err: any) {
      console.error('Failed to send invitation:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
