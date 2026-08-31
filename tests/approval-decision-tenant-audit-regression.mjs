import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-approval-audit-'));
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = dir;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { requestApproval, decideApproval, listApprovals, listAudit } = await import('../services/recruiting/controlPlane.ts');

const approval = await requestApproval({
  tenantId: 'tenant_a',
  jobId: 'job_1',
  candidateId: 'candidate_1',
  action: 'offer',
  requestedBy: 'recruiter-a@example.com'
});

const foreignDecision = await decideApproval(
  approval.id,
  'approved',
  'recruiter-b@example.com',
  'foreign tenant attempt',
  'tenant_b'
);
assert.equal(foreignDecision, null);

const ownerDecision = await decideApproval(
  approval.id,
  'approved',
  'recruiter-a@example.com',
  'approved after review',
  'tenant_a'
);
assert.equal(ownerDecision?.status, 'approved');
assert.equal(ownerDecision?.decidedBy, 'recruiter-a@example.com');

const ownerApprovals = await listApprovals('tenant_a', 'job_1');
assert.equal(ownerApprovals.length, 1);
assert.equal(ownerApprovals[0].status, 'approved');

const foreignApprovals = await listApprovals('tenant_b', 'job_1');
assert.equal(foreignApprovals.length, 0);

const audit = await listAudit('tenant_a', 'job_1', 'candidate_1');
const actions = audit.map(event => event.action);
assert.deepEqual(actions.sort(), ['approval_approved', 'approval_requested'].sort());
assert.ok(audit.every(event => event.tenantId === 'tenant_a'));
assert.ok(audit.every(event => event.candidateId === 'candidate_1'));

console.log('Approval decision tenant/audit isolation regression passed.');
