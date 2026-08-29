import assert from 'node:assert/strict';
import { recordAuditEvent } from '../services/recruiting/auditStore.ts';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

for (const name of ['workflowId', 'candidateId', 'actorId', 'actorType', 'provider', 'model']) {
  await assert.rejects(
    () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', [name]: 'x'.repeat(129) }),
    new RegExp(`${name} exceeds 128 characters`)
  );
}

assert.deepEqual(
  await recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', provider: 'supabase', model: 'x'.repeat(128) }),
  { persisted: false }
);

console.log('Audit optional identity boundary regression passed.');
