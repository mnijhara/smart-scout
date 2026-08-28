import assert from 'node:assert/strict';
import { countAuditEvents } from '../services/recruiting/auditStore.ts';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const result = await countAuditEvents('tenant_a', 'job_1');
assert.deepEqual(result, { configured: false, count: 0 });

console.log('Audit persistence count unconfigured-state check passed.');
