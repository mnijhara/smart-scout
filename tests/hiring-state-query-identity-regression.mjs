import assert from 'node:assert/strict';
import { listHiringStates } from '../services/recruiting/hiringStateStore.ts';

for (const [tenantId, jobId, message] of [
  ['', 'job_123', 'tenantId'],
  ['   ', 'job_123', 'tenantId'],
  ['tenant_123', '', 'jobId'],
  ['tenant_123', '   ', 'jobId'],
]) {
  await assert.rejects(
    () => listHiringStates(tenantId, jobId),
    new RegExp(`Hiring state ${message} is required`),
  );
}

await assert.rejects(
  () => listHiringStates('tenant_123', 'job_123', '   '),
  /Hiring state type is required when provided/,
);

console.log('Hiring state query identity regression passed');
