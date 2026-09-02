import assert from 'node:assert/strict';

process.env.NODE_ENV = 'production';
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SMARTSCOUT_HIRING_STATE_STORE;

const { saveHiringState, listHiringStates } = await import('../services/recruiting/hiringStateStore.ts');

await assert.rejects(
  () => saveHiringState('tenant_prod', 'job_prod', 'screening', { recommendation: 'advance' }),
  /Persistent hiring state storage is not configured/,
  'production must refuse to fall back to local hiring-state storage'
);

await assert.rejects(
  () => listHiringStates('tenant_prod', 'job_prod'),
  /Persistent hiring state storage is not configured/,
  'production reads must also require persistent hiring-state storage'
);

console.log('Hiring-state production persistence guard regression passed.');
