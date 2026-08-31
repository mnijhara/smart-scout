import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-schedule-confirm-'));
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = dir;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { scheduleInterview, updateSchedule, listSchedules } = await import('../services/recruiting/controlPlane.ts');

const first = await scheduleInterview({
  tenantId: 'tenant_a',
  jobId: 'job_1',
  candidateId: 'candidate_1',
  startsAt: '2026-08-27T10:00:00.000Z',
  endsAt: '2026-08-27T11:00:00.000Z',
  timezone: 'Asia/Calcutta',
  mode: 'human',
  status: 'confirmed'
}, 'recruiter-a@example.com');

const proposed = await scheduleInterview({
  tenantId: 'tenant_a',
  jobId: 'job_1',
  candidateId: 'candidate_2',
  startsAt: '2026-08-27T10:30:00.000Z',
  endsAt: '2026-08-27T11:30:00.000Z',
  timezone: 'Asia/Calcutta',
  mode: 'human',
  status: 'proposed'
}, 'recruiter-a@example.com');

await assert.rejects(
  () => updateSchedule(proposed.id, 'confirmed', 'tenant_a', 'recruiter-a@example.com'),
  /overlaps an existing booking/
);

const schedules = await listSchedules('tenant_a');
assert.equal(schedules.find(x => x.id === proposed.id)?.status, 'proposed');

const foreign = await scheduleInterview({
  tenantId: 'tenant_b',
  jobId: 'job_2',
  candidateId: 'candidate_3',
  startsAt: '2026-08-27T10:30:00.000Z',
  endsAt: '2026-08-27T11:30:00.000Z',
  timezone: 'Asia/Calcutta',
  mode: 'human',
  status: 'proposed'
}, 'recruiter-b@example.com');

assert.equal(foreign.tenantId, 'tenant_b');
assert.equal(first.status, 'confirmed');

console.log('Interview schedule confirmation overlap regression passed.');
