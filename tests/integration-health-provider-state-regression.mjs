import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('services/recruiting/productionIntegrations.ts', 'utf8');

assert.match(source, /type IntegrationHealth=.*status:'ready'\|'action-required'\|'unconfigured'/, 'integration health must expose honest configuration states');
assert.match(source, /const healthStatus = \(isConfigured:boolean,humanActionRequired:boolean\).*!isConfigured\?'unconfigured':humanActionRequired\?'action-required':'ready'/, 'unconfigured providers must never be reported as ready');
assert.match(source, /id:'browser-sourcing'.*configured:true.*humanActionRequired:true.*status:healthStatus\(true,true\)/s, 'browser sourcing must disclose its human handoff requirement');
assert.match(source, /id:'resend'.*configured:configured\(env\.RESEND_API_KEY\).*status:healthStatus\(configured\(env\.RESEND_API_KEY\),false\)/s, 'Resend readiness must depend on its credential');
assert.match(source, /id:'supabase'.*configured:configured\(env\.SUPABASE_URL,env\.SUPABASE_SERVICE_ROLE_KEY\).*status:healthStatus\(configured\(env\.SUPABASE_URL,env\.SUPABASE_SERVICE_ROLE_KEY\),false\)/s, 'Supabase readiness must depend on both required credentials');
assert.match(source, /id:'calendar'.*configured:configured\(env\.CALENDAR_API_URL,env\.CALENDAR_API_TOKEN\).*status:healthStatus\(configured\(env\.CALENDAR_API_URL,env\.CALENDAR_API_TOKEN\),false\)/s, 'calendar readiness must depend on its endpoint and token');
assert.match(source, /id:'linkedin'.*configured:configured\(env\.LINKEDIN_CLIENT_ID,env\.LINKEDIN_CLIENT_SECRET\).*status:healthStatus\(configured\(env\.LINKEDIN_CLIENT_ID,env\.LINKEDIN_CLIENT_SECRET\),false\)/s, 'LinkedIn readiness must depend on both licensed API credentials');
assert.match(source, /id:'naukri'.*configured:configured\(env\.NAUKRI_CLIENT_ID,env\.NAUKRI_CLIENT_SECRET\).*status:healthStatus\(configured\(env\.NAUKRI_CLIENT_ID,env\.NAUKRI_CLIENT_SECRET\),false\)/s, 'Naukri readiness must depend on both licensed API credentials');
assert.match(source, /id:'transcription'.*configured:configured\(env\.TRANSCRIPTION_API_URL,env\.TRANSCRIPTION_API_KEY\).*status:healthStatus\(configured\(env\.TRANSCRIPTION_API_URL,env\.TRANSCRIPTION_API_KEY\),false\)/s, 'transcription readiness must depend on endpoint and key');
assert.match(source, /id:'compensation'.*configured:configured\(env\.COMPENSATION_API_URL,env\.COMPENSATION_API_KEY\).*status:healthStatus\(configured\(env\.COMPENSATION_API_URL,env\.COMPENSATION_API_KEY\),false\)/s, 'compensation readiness must depend on endpoint and key');
assert.match(source, /id:'hris'.*configured:configured\(env\.HRIS_API_URL,env\.HRIS_API_TOKEN\).*status:healthStatus\(configured\(env\.HRIS_API_URL,env\.HRIS_API_TOKEN\),false\)/s, 'HRIS readiness must depend on endpoint and token');
assert.match(source, /const MAX_INTEGRATION_RESPONSE_BYTES = 1024 \* 1024;/, 'integration responses must have a bounded memory budget');
assert.match(source, /response\.headers\.get\('content-length'\)/, 'declared provider response size must be rejected before buffering');
assert.match(source, /new TextEncoder\(\)\.encode\(text\)\.byteLength>MAX_INTEGRATION_RESPONSE_BYTES/, 'chunked provider responses must be bounded after buffering');
assert.match(source, /redirect:'error'/, 'integration providers must not be allowed to silently follow redirects');
assert.match(source, /const safeTimeoutMs=Math\.min\(Math\.max\(Number\.isFinite\(timeoutMs\)\?timeoutMs:15000,1000\),30000\)/, 'integration transport timeout must be finite and bounded');
assert.match(source, /signal:controller\.signal/, 'integration transport timeout must abort the underlying request');

// Keep the contract test executable without requiring production credentials.
const module = await import('../services/recruiting/productionIntegrations.ts');
const health = module.integrationHealth({});
const byId = new Map(health.map(provider => [provider.id, provider]));
assert.equal(byId.get('browser-sourcing')?.status, 'action-required');
assert.equal(byId.get('resend')?.status, 'unconfigured');
assert.deepEqual(byId.get('resend')?.missing, ['RESEND_API_KEY']);
assert.equal(byId.get('supabase')?.status, 'unconfigured');
assert.deepEqual(byId.get('supabase')?.missing, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
assert.equal(byId.get('calendar')?.status, 'unconfigured');
assert.deepEqual(byId.get('calendar')?.missing, ['CALENDAR_API_URL', 'CALENDAR_API_TOKEN']);

for (const [id, missingKeys] of [
  ['linkedin', ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET']],
  ['naukri', ['NAUKRI_CLIENT_ID', 'NAUKRI_CLIENT_SECRET']],
  ['transcription', ['TRANSCRIPTION_API_URL', 'TRANSCRIPTION_API_KEY']],
  ['compensation', ['COMPENSATION_API_URL', 'COMPENSATION_API_KEY']],
  ['hris', ['HRIS_API_URL', 'HRIS_API_TOKEN']],
]) {
  assert.equal(byId.get(id)?.status, 'unconfigured', `${id} must not report ready without credentials`);
  assert.deepEqual(byId.get(id)?.missing, missingKeys, `${id} must disclose every missing configuration key`);
}

const whitespaceHealth = module.integrationHealth({
  RESEND_API_KEY: '   ',
  SUPABASE_URL: ' https://example.supabase.co ',
  SUPABASE_SERVICE_ROLE_KEY: '\t',
  CALENDAR_API_URL: '\n',
  CALENDAR_API_TOKEN: ' test-calendar ',
  LINKEDIN_CLIENT_ID: ' ',
  LINKEDIN_CLIENT_SECRET: 'test-linkedin',
  NAUKRI_CLIENT_ID: 'test-naukri',
  NAUKRI_CLIENT_SECRET: '\n',
});
const whitespaceById = new Map(whitespaceHealth.map(provider => [provider.id, provider]));
assert.equal(whitespaceById.get('resend')?.status, 'unconfigured');
assert.deepEqual(whitespaceById.get('resend')?.missing, ['RESEND_API_KEY']);
assert.equal(whitespaceById.get('supabase')?.status, 'unconfigured');
assert.deepEqual(whitespaceById.get('supabase')?.missing, ['SUPABASE_SERVICE_ROLE_KEY']);
assert.equal(whitespaceById.get('calendar')?.status, 'unconfigured');
assert.deepEqual(whitespaceById.get('calendar')?.missing, ['CALENDAR_API_URL']);
assert.equal(whitespaceById.get('linkedin')?.status, 'unconfigured');
assert.deepEqual(whitespaceById.get('linkedin')?.missing, ['LINKEDIN_CLIENT_ID']);
assert.equal(whitespaceById.get('naukri')?.status, 'unconfigured');
assert.deepEqual(whitespaceById.get('naukri')?.missing, ['NAUKRI_CLIENT_SECRET']);

const configured = module.integrationHealth({
  RESEND_API_KEY: 'test-resend',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-supabase',
  CALENDAR_API_URL: 'https://calendar.example.com',
  CALENDAR_API_TOKEN: 'test-calendar',
  LINKEDIN_CLIENT_ID: 'test-linkedin-id',
  LINKEDIN_CLIENT_SECRET: 'test-linkedin-secret',
  NAUKRI_CLIENT_ID: 'test-naukri-id',
  NAUKRI_CLIENT_SECRET: 'test-naukri-secret',
  TRANSCRIPTION_API_URL: 'https://transcription.example.com',
  TRANSCRIPTION_API_KEY: 'test-transcription',
  COMPENSATION_API_URL: 'https://compensation.example.com',
  COMPENSATION_API_KEY: 'test-compensation',
  HRIS_API_URL: 'https://hris.example.com',
  HRIS_API_TOKEN: 'test-hris',
});
const configuredById = new Map(configured.map(provider => [provider.id, provider]));
for (const id of ['resend', 'supabase', 'calendar', 'linkedin', 'naukri', 'transcription', 'compensation', 'hris']) {
  assert.equal(configuredById.get(id)?.status, 'ready', `${id} should report ready when all required configuration is present`);
  assert.deepEqual(configuredById.get(id)?.missing, [], `${id} should have no missing configuration when configured`);
}

console.log('Integration provider configuration-state contract: OK');
