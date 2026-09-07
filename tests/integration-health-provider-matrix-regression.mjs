import assert from 'node:assert/strict';

const { integrationHealth } = await import('../services/recruiting/productionIntegrations.ts');
const health = integrationHealth({});
const byId = new Map(health.map(provider => [provider.id, provider]));

const expectedMissing = {
  resend: ['RESEND_API_KEY'],
  supabase: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  linkedin: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
  naukri: ['NAUKRI_CLIENT_ID', 'NAUKRI_CLIENT_SECRET'],
  calendar: ['CALENDAR_API_URL', 'CALENDAR_API_TOKEN'],
  transcription: ['TRANSCRIPTION_API_URL', 'TRANSCRIPTION_API_KEY'],
  compensation: ['COMPENSATION_API_URL', 'COMPENSATION_API_KEY'],
  hris: ['HRIS_API_URL', 'HRIS_API_TOKEN'],
};

assert.equal(byId.size, health.length, 'integration health must not expose duplicate provider ids');
assert.deepEqual(
  new Set(health.map(provider => provider.id)),
  new Set([...Object.keys(expectedMissing), 'browser-sourcing']),
  'integration health provider ids must match the supported provider matrix',
);

for (const [id, missing] of Object.entries(expectedMissing)) {
  const provider = byId.get(id);
  assert.equal(provider?.status, 'unconfigured', `${id} must be unconfigured without credentials`);
  assert.deepEqual(provider?.missing, missing, `${id} must disclose every missing credential field`);
}

assert.equal(byId.get('browser-sourcing')?.status, 'action-required');
assert.equal(byId.get('browser-sourcing')?.humanActionRequired, true);

console.log('Integration provider health matrix contract: OK');
