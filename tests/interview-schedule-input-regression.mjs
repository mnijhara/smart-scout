import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-schedule-input-'));
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = dir;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { scheduleInterview } = await import('../services/recruiting/controlPlane.ts');
const base = {
  tenantId: 'tenant_a',
  jobId: 'job_1',
  candidateId: 'candidate_1',
  startsAt: '2026-08-27T10:00:00.000Z',
  endsAt: '2026-08-27T11:00:00.000Z',
  timezone: 'Asia/Calcutta',
  mode: 'human',
  status: 'proposed'
};

await assert.rejects(() => scheduleInterview({ ...base, status: 'bogus' }), /Invalid schedule status/);
await assert.rejects(() => scheduleInterview({ ...base, mode: 'bogus' }), /Invalid interview mode/);
await assert.rejects(() => scheduleInterview({ ...base, timezone: '   ' }), /Interview timezone is required/);

const created = await scheduleInterview(base, ' recruiter@example.com ');
assert.equal(created.status, 'proposed');
assert.equal(created.mode, 'human');
assert.equal(created.timezone, 'Asia/Calcutta');

console.log('Interview schedule input regression passed.');
