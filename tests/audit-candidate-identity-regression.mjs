import assert from 'node:assert/strict';
import { recordAuditEvent } from '../services/recruiting/auditStore.ts';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', candidateId: '' }),
  /candidateId is required when provided/
);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', candidateId: '   ' }),
  /candidateId is required when provided/
);
assert.deepEqual(
  await recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', candidateId: null }),
  { persisted: false }
);

console.log('Audit candidate identity regression passed.');
