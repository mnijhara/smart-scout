import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-approval-decision-'));
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = dir;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { requestApproval, decideApproval, listApprovals, listAudit } = await import('../services/recruiting/controlPlane.ts');

const approval = await requestApproval({
  tenantId: 'tenant_decision',
  jobId: 'job_1',
  action: 'decision',
  requestedBy: 'requester@example.com',
  note: 'Review candidate evidence'
});

const decided = await decideApproval(approval.id, 'approved', 'approver@example.com', 'Evidence reviewed', 'tenant_decision');
assert.equal(decided?.id, approval.id, 'approval decisions must update the existing approval');
assert.equal(decided?.status, 'approved');
assert.equal(decided?.decidedBy, 'approver@example.com');
assert.equal(decided?.note, 'Evidence reviewed');

const approvals = await listApprovals('tenant_decision', 'job_1');
assert.equal(approvals.length, 1, 'approving an approval must not create a duplicate approval request');
assert.equal(approvals[0].id, approval.id);
assert.equal(approvals[0].status, 'approved');

const events = await listAudit('tenant_decision', 'job_1');
assert.ok(events.some(item => item.action === 'approval_requested' && item.actor === 'requester@example.com'));
assert.ok(events.some(item => item.action === 'approval_approved' && item.actor === 'approver@example.com'));

await assert.rejects(
  () => decideApproval(approval.id, 'approved', 'second@example.com', undefined, 'tenant_decision'),
  /Approval is already decided/
);

console.log('Approval decision persistence regression checks passed.');
