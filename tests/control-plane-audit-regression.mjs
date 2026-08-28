import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-audit-'));
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = dir;

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { requestApproval, decideApproval, scheduleInterview, updateSchedule, listAudit } = await import('../services/recruiting/controlPlane.ts');

const approval = await requestApproval({
  tenantId: 'tenant_a',
  jobId: 'job_1',
  candidateId: 'candidate_1',
  action: 'jd_approval',
  requestedBy: 'recruiter@example.com'
});
await decideApproval(approval.id, 'approved', 'recruiter@example.com', 'Approved for publishing', 'tenant_a');

const schedule = await scheduleInterview({
  tenantId: 'tenant_a',
  jobId: 'job_1',
  candidateId: 'candidate_1',
  startsAt: '2026-08-27T10:00:00.000Z',
  endsAt: '2026-08-27T11:00:00.000Z',
  timezone: 'Asia/Calcutta',
  mode: 'human',
  status: 'proposed'
});
await updateSchedule(schedule.id, 'confirmed', 'tenant_a', 'recruiter@example.com');
await updateSchedule(schedule.id, 'cancelled', 'tenant_a', 'recruiter@example.com');

const events = await listAudit('tenant_a', 'job_1');
const actions = events.map(event => event.action);
assert.ok(actions.includes('approval_requested'), 'approval request must be audited');
assert.ok(actions.includes('approval_approved'), 'approval decision must be audited');
assert.ok(actions.includes('interview_scheduled'), 'interview creation must be audited');
assert.ok(actions.includes('interview_status_changed'), 'interview status changes must be audited');
assert.ok(events.some(event => event.metadata?.previousStatus === 'proposed' && event.metadata?.status === 'confirmed'));
assert.ok(events.some(event => event.metadata?.previousStatus === 'confirmed' && event.metadata?.status === 'cancelled'));
const statusEvents = events.filter(event => event.action === 'interview_status_changed');
assert.equal(statusEvents.length, 2);
assert.ok(statusEvents.every(event => event.actor === 'recruiter@example.com'), 'status audit must retain authenticated actor');
assert.ok(events.every(event => event.persistence === 'local-fallback'), 'unconfigured audit provider must be explicit');

console.log('Control-plane audit lifecycle and persistence-state checks passed.');
