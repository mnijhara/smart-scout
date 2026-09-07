import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('services/recruiting/productionIntegrations.ts', 'utf8');

assert.match(source, /type IntegrationHealth=.*status:'ready'\|'action-required'\|'unconfigured'/, 'integration health must expose honest configuration states');
assert.match(source, /const healthStatus = \(isConfigured:boolean,humanActionRequired:boolean\).*!isConfigured\?'unconfigured':humanActionRequired\?'action-required':'ready'/, 'unconfigured providers must never be reported as ready');
assert.match(source, /id:'browser-sourcing'.*configured:true.*humanActionRequired:true.*status:healthStatus\(true,true\)/s, 'browser sourcing must disclose its human handoff requirement');
assert.match(source, /id:'resend'.*configured:configured\(env\.RESEND_API_KEY\).*status:healthStatus\(configured\(env\.RESEND_API_KEY\),false\)/s, 'Resend readiness must depend on its credential');
assert.match(source, /id:'supabase'.*configured:configured\(env\.SUPABASE_URL,env\.SUPABASE_SERVICE_ROLE_KEY\).*status:healthStatus\(configured\(env\.SUPABASE_URL,env\.SUPABASE_SERVICE_ROLE_KEY\),false\)/s, 'Supabase readiness must depend on both required credentials');
assert.match(source, /id:'calendar'.*configured:configured\(env\.CALENDAR_API_URL,env\.CALENDAR_API_TOKEN\).*status:healthStatus\(configured\(env\.CALENDAR_API_URL,env\.CALENDAR_API_TOKEN\),false\)/s, 'calendar readiness must depend on its endpoint and token');

console.log('Integration provider configuration-state contract: OK');
