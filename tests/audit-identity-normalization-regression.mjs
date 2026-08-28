import assert from 'node:assert/strict';

process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';

const { recordAuditEvent, listAuditEvents, countAuditEvents } = await import('../services/recruiting/auditStore.ts');

await assert.rejects(
  () => recordAuditEvent({ tenantId: '   ', eventType: 'candidate_created' }),
  /tenantId is required/
);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: '   ' }),
  /eventType is required/
);

assert.deepEqual(await listAuditEvents('   '), []);
assert.deepEqual(await countAuditEvents('   '), { configured: false, count: 0 });

console.log('audit identity normalization regression passed');
