import assert from 'node:assert/strict';
import { recordAuditEvent } from '../services/recruiting/auditStore.ts';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', payload: { evidence: 'x'.repeat(65 * 1024) } }),
  /payload exceeds 65536 bytes/
);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', payload: { value: BigInt(1) } }),
  /payload must be JSON serializable/
);
assert.deepEqual(
  await recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', payload: { source: 'e2e' } }),
  { persisted: false }
);

console.log('Audit payload boundary regression passed.');
