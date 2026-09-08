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
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', payload: { value: '😀'.repeat(20 * 1024) } }),
  /payload exceeds 65536 bytes/
);

const exactAsciiPayload = { value: 'x'.repeat(65525) };
assert.equal(Buffer.byteLength(JSON.stringify(exactAsciiPayload), 'utf8'), 65536);
assert.deepEqual(
  await recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', payload: exactAsciiPayload }),
  { persisted: false }
);

const oneByteOverPayload = { value: 'x'.repeat(65526) };
assert.equal(Buffer.byteLength(JSON.stringify(oneByteOverPayload), 'utf8'), 65537);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', payload: oneByteOverPayload }),
  /payload exceeds 65536 bytes/
);

// The limit is byte-based, so exercise an exact UTF-8 boundary with multibyte data.
const exactUtf8Payload = { value: '😀'.repeat(16_381) };
assert.equal(Buffer.byteLength(JSON.stringify(exactUtf8Payload), 'utf8'), 65_536);
assert.deepEqual(
  await recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', payload: exactUtf8Payload }),
  { persisted: false }
);

const utf8OneByteOverPayload = { value: `${'😀'.repeat(16_381)}x` };
assert.equal(Buffer.byteLength(JSON.stringify(utf8OneByteOverPayload), 'utf8'), 65_537);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', payload: utf8OneByteOverPayload }),
  /payload exceeds 65536 bytes/
);

console.log('Audit payload boundary regression passed.');
