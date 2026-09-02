import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { recordAuditEvent } = await import('../services/recruiting/auditStore.ts');

await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'decision', payload: { circular: (() => { const value = {}; value.self = value; return value; })() } }),
  /JSON serializable/i,
  'circular audit payloads must be rejected before persistence'
);

await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'decision', evidence: 'not-an-array' }),
  /evidence must be an array/i,
  'audit evidence must remain a JSON array'
);

await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'decision', actorId: ' '.repeat(129) }),
  /actorId exceeds 128/i,
  'audit actor identity must respect the storage boundary'
);

await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'x'.repeat(129) }),
  /eventType exceeds 128/i,
  'audit event type must respect the storage boundary'
);

const fallback = await recordAuditEvent({
  tenantId: 'tenant_a',
  eventType: 'decision',
  actorType: 'hiring-lifecycle',
  actorId: 'system',
  payload: { stateId: 'state_1', recommendation: 'hire' },
  evidence: []
});
assert.equal(fallback.persisted, false, 'missing provider configuration must remain an explicit local-fallback state');

console.log('Audit-store payload, evidence, identity, and provider-state boundary regressions passed.');
