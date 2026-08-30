import assert from 'node:assert/strict';
import { listAuditEvents } from '../services/recruiting/auditStore.ts';

await assert.rejects(
  () => listAuditEvents('tenant_regression', 'job_workflow_regression', '   '),
  /candidateId is required when provided/
);

await assert.rejects(
  () => listAuditEvents('tenant_regression', 'job_workflow_regression', 'x'.repeat(129)),
  /candidateId exceeds 128 characters/
);

const unconfigured = await listAuditEvents('tenant_regression', 'job_workflow_regression', 'candidate_regression');
assert.deepEqual(unconfigured, []);

console.log('audit candidate query regression passed');
