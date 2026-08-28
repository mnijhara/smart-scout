import assert from 'node:assert/strict';
import { recordAuditEvent, countAuditEvents, listAuditEvents } from '../services/recruiting/auditStore.ts';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

await assert.rejects(() => recordAuditEvent({ tenantId: '', eventType: 'candidate_created' }), /tenantId is required/);
await assert.rejects(() => recordAuditEvent({ tenantId: 'tenant_a', eventType: '   ' }), /eventType is required/);
await assert.rejects(() => countAuditEvents('   '), /tenantId is required/);
await assert.rejects(() => listAuditEvents(''), /tenantId is required/);

assert.deepEqual(await countAuditEvents('tenant_a', 'job_1'), { configured: false, count: 0 });
assert.deepEqual(await listAuditEvents('tenant_a', 'job_1'), []);

console.log('Audit identity validation regression passed.');
