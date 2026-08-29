import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-schedule-tenant-'));
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = dir;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { scheduleInterview, updateSchedule, listSchedules } = await import('../services/recruiting/controlPlane.ts');

const created = await scheduleInterview({
  tenantId: 'tenant_a',
  jobId: 'job_1',
  candidateId: 'candidate_1',
  startsAt: '2026-08-27T10:00:00.000Z',
  endsAt: '2026-08-27T11:00:00.000Z',
  timezone: 'Asia/Calcutta',
  mode: 'human',
  status: 'proposed'
}, 'recruiter-a@example.com');

const denied = await updateSchedule(created.id, 'confirmed', 'tenant_b', 'recruiter-b@example.com');
assert.equal(denied, null);

const ownerView = await listSchedules('tenant_a');
assert.equal(ownerView.length, 1);
assert.equal(ownerView[0].status, 'proposed');

const foreignView = await listSchedules('tenant_b');
assert.equal(foreignView.length, 0);

console.log('Interview schedule tenant isolation regression passed.');
