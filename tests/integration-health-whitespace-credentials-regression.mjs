import assert from 'node:assert/strict';

const { integrationHealth } = await import('../services/recruiting/productionIntegrations.ts');

const health = integrationHealth({
  RESEND_API_KEY: '   ',
  SUPABASE_URL: ' https://example.supabase.co ',
  SUPABASE_SERVICE_ROLE_KEY: '\t',
  LINKEDIN_CLIENT_ID: 'client',
  LINKEDIN_CLIENT_SECRET: 'secret',
  NAUKRI_CLIENT_ID: '  ',
  NAUKRI_CLIENT_SECRET: 'secret',
  CALENDAR_API_URL: 'https://calendar.example',
  CALENDAR_API_TOKEN: ' token ',
});

const resend = health.find(provider => provider.id === 'resend');
assert.equal(resend?.configured, false, 'whitespace-only credentials must not report a provider as configured');
assert.deepEqual(resend?.missing, ['RESEND_API_KEY']);

const supabase = health.find(provider => provider.id === 'supabase');
assert.equal(supabase?.configured, false, 'partial whitespace credentials must not report Supabase as configured');
assert.deepEqual(supabase?.missing, ['SUPABASE_SERVICE_ROLE_KEY']);

const linkedin = health.find(provider => provider.id === 'linkedin');
assert.equal(linkedin?.configured, true, 'trimmed non-empty credentials should report configured');

const naukri = health.find(provider => provider.id === 'naukri');
assert.equal(naukri?.configured, false);
assert.deepEqual(naukri?.missing, ['NAUKRI_CLIENT_ID']);

const calendar = health.find(provider => provider.id === 'calendar');
assert.equal(calendar?.configured, true);

console.log('Integration health whitespace-credential regression passed');
