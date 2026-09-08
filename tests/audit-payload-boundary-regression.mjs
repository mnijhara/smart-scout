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

// Evidence is stored separately from payload, so enforce its byte boundary too.
const exactEvidence = ['x'.repeat(65_525)];
assert.equal(Buffer.byteLength(JSON.stringify(exactEvidence), 'utf8'), 65_529);
assert.deepEqual(
  await recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', evidence: exactEvidence }),
  { persisted: false }
);

const oversizedEvidence = ['x'.repeat(65_532)];
assert.equal(Buffer.byteLength(JSON.stringify(oversizedEvidence), 'utf8'), 65_536);
assert.deepEqual(
  await recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', evidence: oversizedEvidence }),
  { persisted: false }
);

const evidenceOneByteOver = ['x'.repeat(65_533)];
assert.equal(Buffer.byteLength(JSON.stringify(evidenceOneByteOver), 'utf8'), 65_537);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', evidence: evidenceOneByteOver }),
  /evidence exceeds 65536 bytes/
);

// Audit identity fields have bounded lengths so malformed or abusive identifiers cannot grow without bound.
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'x'.repeat(257), eventType: 'candidate_created' }),
  /tenantId exceeds 256 characters/
);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'x'.repeat(129) }),
  /eventType exceeds 128 characters/
);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', workflowId: 'x'.repeat(129) }),
  /workflowId exceeds 128 characters/
);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', candidateId: 'x'.repeat(129) }),
  /candidateId exceeds 128 characters/
);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', actorId: 'x'.repeat(129) }),
  /actorId exceeds 128 characters/
);
await assert.rejects(
  () => recordAuditEvent({ tenantId: 'tenant_a', eventType: 'candidate_created', provider: 'x'.repeat(129) }),
  /provider exceeds 128 characters/
);

console.log('Audit payload boundary regression passed.');
