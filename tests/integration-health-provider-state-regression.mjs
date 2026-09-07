import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('services/recruiting/productionIntegrations.ts', 'utf8');

assert.match(source, /type IntegrationHealth=.*status:'ready'\|'action-required'\|'unconfigured'/, 'integration health must expose honest configuration states');
assert.match(source, /const healthStatus = \(isConfigured:boolean,humanActionRequired:boolean\).*!isConfigured\?'unconfigured':humanActionRequired\?'action-required':'ready'/, 'unconfigured providers must never be reported as ready');
assert.match(source, /id:'browser-sourcing'.*configured:true.*humanActionRequired:true.*status:healthStatus\(true,true\)/s, 'browser sourcing must disclose its human handoff requirement');
assert.match(source, /id:'resend'.*configured:configured\(env\.RESEND_API_KEY\).*status:healthStatus\(configured\(env\.RESEND_API_KEY\),false\)/s, 'Resend readiness must depend on its credential');
assert.match(source, /id:'supabase'.*configured:configured\(env\.SUPABASE_URL,env\.SUPABASE_SERVICE_ROLE_KEY\).*status:healthStatus\(configured\(env\.SUPABASE_URL,env\.SUPABASE_SERVICE_ROLE_KEY\),false\)/s, 'Supabase readiness must depend on both required credentials');
assert.match(source, /id:'calendar'.*configured:configured\(env\.CALENDAR_API_URL,env\.CALENDAR_API_TOKEN\).*status:healthStatus\(configured\(env\.CALENDAR_API_URL,env\.CALENDAR_API_TOKEN\),false\)/s, 'calendar readiness must depend on its endpoint and token');

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

const whitespaceHealth = module.integrationHealth({
  RESEND_API_KEY: '   ',
  SUPABASE_URL: ' https://example.supabase.co ',
  SUPABASE_SERVICE_ROLE_KEY: '\t',
  CALENDAR_API_URL: '\n',
  CALENDAR_API_TOKEN: ' test-calendar ',
});
const whitespaceById = new Map(whitespaceHealth.map(provider => [provider.id, provider]));
assert.equal(whitespaceById.get('resend')?.status, 'unconfigured');
assert.deepEqual(whitespaceById.get('resend')?.missing, ['RESEND_API_KEY']);
assert.equal(whitespaceById.get('supabase')?.status, 'unconfigured');
assert.deepEqual(whitespaceById.get('supabase')?.missing, ['SUPABASE_SERVICE_ROLE_KEY']);
assert.equal(whitespaceById.get('calendar')?.status, 'unconfigured');
assert.deepEqual(whitespaceById.get('calendar')?.missing, ['CALENDAR_API_URL']);

const configured = module.integrationHealth({
  RESEND_API_KEY: 'test-resend',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-supabase',
  CALENDAR_API_URL: 'https://calendar.example.com',
  CALENDAR_API_TOKEN: 'test-calendar',
});
const configuredById = new Map(configured.map(provider => [provider.id, provider]));
assert.equal(configuredById.get('resend')?.status, 'ready');
assert.equal(configuredById.get('supabase')?.status, 'ready');
assert.equal(configuredById.get('calendar')?.status, 'ready');

console.log('Integration provider configuration-state contract: OK');
