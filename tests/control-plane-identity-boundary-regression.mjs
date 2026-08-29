import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-control-identity-'));
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = dir;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { requestApproval, audit, scheduleInterview, listApprovals, listAudit, usageSummary } = await import('../services/recruiting/controlPlane.ts');

await assert.rejects(() => requestApproval({ tenantId: '   ', jobId: 'job_1', action: 'jd_approval', requestedBy: 'recruiter@example.com' }), /Tenant identity is required/);
await assert.rejects(() => requestApproval({ tenantId: 'tenant_a', jobId: '   ', action: 'jd_approval', requestedBy: 'recruiter@example.com' }), /Job identity is required/);
await assert.rejects(() => requestApproval({ tenantId: 'tenant_a', jobId: 'job_1', action: 'jd_approval', requestedBy: '   ' }), /Requester identity is required/);
await assert.rejects(() => audit({ tenantId: 'tenant_a', action: '   ', actor: 'recruiter@example.com' }), /Audit action is required/);
await assert.rejects(() => audit({ tenantId: 'tenant_a', action: 'manual_note', actor: '   ' }), /Audit actor is required/);
await assert.rejects(() => scheduleInterview({ tenantId: 'tenant_a', jobId: 'job_1', candidateId: '   ', startsAt: '2026-08-27T10:00:00.000Z', endsAt: '2026-08-27T11:00:00.000Z', timezone: 'Asia/Calcutta', mode: 'human', status: 'proposed' }), /Candidate identity is required/);

const approval = await requestApproval({ tenantId: 'tenant_a', jobId: 'job_1', action: 'jd_approval', requestedBy: 'recruiter@example.com' });
assert.equal((await listApprovals(' tenant_a ')).length, 1);
await audit({ tenantId: 'tenant_a', jobId: 'job_1', action: 'manual_note', actor: 'recruiter@example.com' });
assert.equal((await listAudit(' tenant_a ', 'job_1')).length, 2);
assert.equal((await usageSummary(' tenant_a ')).constructor, Object);
assert.ok(approval.id.startsWith('approval_'));

console.log('Control-plane identity boundary regression passed.');
