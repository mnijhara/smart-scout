import assert from 'node:assert/strict';
import { recordAuditEvent } from '../services/recruiting/auditStore.ts';

const oversizedTenant = 't'.repeat(257);
await assert.rejects(
  () => recordAuditEvent({ tenantId: oversizedTenant, eventType: 'test' }),
  /tenantId exceeds 256/
);

const result = await recordAuditEvent({ tenantId: '  tenant-valid  ', eventType: '  test  ' });
assert.equal(result.persisted, false, 'regression should not require external Supabase credentials');

console.log('audit tenant boundary regression passed');
