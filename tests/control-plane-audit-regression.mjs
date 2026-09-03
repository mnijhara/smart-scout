import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-audit-'));
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = dir;

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { requestApproval, decideApproval, scheduleInterview, updateSchedule, listAudit, listSchedules } = await import('../services/recruiting/controlPlane.ts');

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

const otherTenantSchedule = await scheduleInterview({
  tenantId: 'tenant_b',
  jobId: 'job_2',
  candidateId: 'candidate_2',
  startsAt: '2026-08-27T10:00:00.000Z',
  endsAt: '2026-08-27T11:00:00.000Z',
  timezone: 'Asia/Calcutta',
  mode: 'human',
  status: 'proposed'
});
assert.equal(await updateSchedule(otherTenantSchedule.id, 'confirmed', 'tenant_a', 'recruiter@example.com'), null, 'a tenant must not mutate another tenant schedule');
assert.equal((await listSchedules('tenant_a')).length, 1, 'schedule listing must remain tenant scoped');
assert.equal((await listSchedules('tenant_b')).length, 1, 'other tenant schedule must remain isolated');

const persistedSchedules = JSON.parse(fs.readFileSync(path.join(dir, 'schedules.json'), 'utf8'));
assert.equal(persistedSchedules.length, 2);
const persistedSchedule = persistedSchedules.find(item => item.id === schedule.id);
assert.equal(persistedSchedule.status, 'cancelled');
assert.equal(Object.hasOwn(persistedSchedule, '__previousStatus'), false, 'audit-only transition metadata must never be persisted');
assert.deepEqual(Object.keys(persistedSchedule).sort(), [
  'candidateId', 'createdAt', 'endsAt', 'id', 'jobId', 'mode', 'startsAt', 'status', 'tenantId', 'timezone', 'updatedAt'
].sort(), 'schedule persistence must contain only the public schedule contract');

const concurrentStartsAt = '2026-08-28T10:00:00.000Z';
const concurrentEndsAt = '2026-08-28T11:00:00.000Z';
const concurrentResults = await Promise.allSettled([
  scheduleInterview({ tenantId: 'tenant_a', jobId: 'job_3', candidateId: 'candidate_3', startsAt: concurrentStartsAt, endsAt: concurrentEndsAt, timezone: 'Asia/Calcutta', mode: 'human', status: 'proposed' }),
  scheduleInterview({ tenantId: 'tenant_a', jobId: 'job_4', candidateId: 'candidate_4', startsAt: concurrentStartsAt, endsAt: concurrentEndsAt, timezone: 'Asia/Calcutta', mode: 'human', status: 'proposed' })
]);
assert.equal(concurrentResults.filter(result => result.status === 'fulfilled').length, 1, 'overlapping concurrent bookings must serialize so only one succeeds');
assert.equal(concurrentResults.filter(result => result.status === 'rejected').length, 1, 'the overlapping concurrent booking must be rejected');
assert.equal((await listSchedules('tenant_a')).filter(item => item.startsAt === concurrentStartsAt).length, 1, 'concurrent overlap rejection must leave exactly one persisted booking');

const events = await listAudit('tenant_a', 'job_1');
const actions = events.map(event => event.action);
assert.ok(actions.includes('approval_requested'), 'approval request must be audited');
assert.ok(actions.includes('approval_approved'), 'approval decision must be audited');
assert.ok(actions.includes('interview_scheduled'), 'interview creation must be audited');
assert.ok(actions.includes('interview_status_changed'), 'interview status changes must be audited');
assert.ok(events.some(event => event.metadata?.previousStatus === 'proposed' && event.metadata?.status === 'confirmed'));
assert.ok(events.some(event => event.metadata?.previousStatus === 'confirmed' && event.metadata?.status === 'cancelled'));
assert.ok(events.every(event => event.tenantId === 'tenant_a'), 'audit listing must remain tenant scoped');
const statusEvents = events.filter(event => event.action === 'interview_status_changed');
assert.equal(statusEvents.length, 2);
assert.ok(statusEvents.every(event => event.actor === 'recruiter@example.com'), 'status audit must retain authenticated actor');
assert.ok(events.every(event => event.persistence === 'local-fallback'), 'unconfigured audit provider must be explicit');

console.log('Control-plane audit lifecycle, schedule persistence, tenant isolation, and concurrent booking checks passed.');
