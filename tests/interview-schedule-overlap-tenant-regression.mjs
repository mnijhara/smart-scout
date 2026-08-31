import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-schedule-overlap-'));
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = dir;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { scheduleInterview } = await import('../services/recruiting/controlPlane.ts');

const base = {
  jobId: 'job_1',
  candidateId: 'candidate_1',
  startsAt: '2026-08-27T10:00:00.000Z',
  endsAt: '2026-08-27T11:00:00.000Z',
  timezone: 'Asia/Calcutta',
  mode: 'human',
  status: 'proposed'
};

await scheduleInterview({ ...base, tenantId: 'tenant_a' }, 'recruiter-a@example.com');

await assert.rejects(
  () => scheduleInterview({ ...base, tenantId: 'tenant_a', candidateId: 'candidate_2' }, 'recruiter-a@example.com'),
  /overlaps an existing booking/
);

const foreign = await scheduleInterview({ ...base, tenantId: 'tenant_b', candidateId: 'candidate_3' }, 'recruiter-b@example.com');
assert.equal(foreign.tenantId, 'tenant_b');

console.log('Interview schedule overlap tenant regression passed.');
