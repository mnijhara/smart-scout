import assert from 'node:assert/strict';
import { recordAuditEvent } from '../services/recruiting/auditStore.ts';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', evidence: ['x'.repeat(65 * 1024)] }),
  /evidence exceeds 65536 bytes/
);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', evidence: [BigInt(1)] }),
  /evidence must be JSON serializable/
);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', evidence: 'not-an-array' }),
  /evidence must be an array/
);
assert.deepEqual(
  await recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', evidence: [{ source: 'e2e' }] }),
  { persisted: false }
);

console.log('Audit evidence boundary regression passed.');
