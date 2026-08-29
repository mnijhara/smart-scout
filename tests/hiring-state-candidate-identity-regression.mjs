import assert from 'node:assert/strict';
import { saveHiringState } from '../services/recruiting/hiringStateStore.ts';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.NODE_ENV = 'test';

await assert.rejects(
  () => saveHiringState('tenant_a', 'job_a', 'screening', {}, ''),
  /candidateId is required when provided/
);
await assert.rejects(
  () => saveHiringState('tenant_a', 'job_a', 'screening', {}, '   '),
  /candidateId is required when provided/
);

console.log('Hiring state candidate identity regression passed.');
