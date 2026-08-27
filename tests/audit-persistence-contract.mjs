import assert from 'node:assert/strict';
import { recordAuditEvent } from '../services/recruiting/auditStore.ts';

const previousUrl = process.env.SUPABASE_URL;
const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

try {
  const result = await recordAuditEvent({
    tenantId: 'tenant_a',
    workflowId: 'job_1',
    eventType: 'audit_persistence_probe',
    actorType: 'test',
    actorId: 'test-runner',
  });
  assert.equal(result.persisted, false, 'provider-unconfigured state must be explicit');
  assert.equal(result.event, undefined, 'unpersisted audit must not masquerade as a database event');
} finally {
  if (previousUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = previousUrl;
  if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
}

console.log('Audit persistence configuration contract passed.');
