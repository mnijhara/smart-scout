import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(os.tmpdir(), 'smartscout-interview-audit-'));
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = root;
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';

try {
  const { scheduleInterview, listAudit } = await import('../services/recruiting/controlPlane.ts');
  await scheduleInterview({
    tenantId: 'tenant-a',
    jobId: 'job-a',
    candidateId: 'candidate-a',
    startsAt: '2026-08-28T10:00:00Z',
    endsAt: '2026-08-28T10:30:00Z',
    timezone: 'UTC',
    mode: 'human',
    status: 'proposed',
  }, 'recruiter@example.test');

  const events = await listAudit('tenant-a', 'job-a');
  assert.equal(events.length, 1);
  assert.equal(events[0].action, 'interview_scheduled');
  assert.equal(events[0].actor, 'recruiter@example.test');
  assert.equal(events[0].persistence, 'local-fallback');
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log('Interview audit actor regression passed.');
