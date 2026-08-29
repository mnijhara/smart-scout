import assert from 'node:assert/strict';
import { recordAuditEvent } from '../services/recruiting/auditStore.ts';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'x'.repeat(129) }),
  /eventType exceeds 128 characters/
);

assert.deepEqual(
  await recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created' }),
  { persisted: false }
);

console.log('Audit event type boundary regression passed.');
