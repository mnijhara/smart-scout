import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-audit-candidate-'));
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = dir;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { audit, listAudit } = await import('../services/recruiting/controlPlane.ts');

await audit({ tenantId: 'tenant_a', jobId: 'job_1', candidateId: 'candidate_1', action: 'offer_created', actor: 'recruiter@example.com' });
await audit({ tenantId: 'tenant_a', jobId: 'job_1', candidateId: 'candidate_2', action: 'offer_created', actor: 'recruiter@example.com' });
await audit({ tenantId: 'tenant_a', jobId: 'job_2', candidateId: 'candidate_1', action: 'interview_scheduled', actor: 'recruiter@example.com' });
await audit({ tenantId: 'tenant_b', jobId: 'job_1', candidateId: 'candidate_1', action: 'offer_created', actor: 'other@example.com' });

const events = await listAudit('tenant_a', 'job_1', 'candidate_1');
assert.equal(events.length, 1, 'candidate-scoped audit reads must exclude sibling candidates');
assert.equal(events[0].candidateId, 'candidate_1');
assert.equal(events[0].jobId, 'job_1');

await assert.rejects(() => listAudit('tenant_a', 'job_1', '   '), /Candidate identity is required/);
const jobEvents = await listAudit('tenant_a', 'job_1');
assert.equal(jobEvents.length, 2, 'job-scoped reads must retain both candidates');
assert.ok(jobEvents.every(event => event.tenantId === 'tenant_a' && event.jobId === 'job_1'));

console.log('Control-plane candidate-scoped audit query regression passed.');
