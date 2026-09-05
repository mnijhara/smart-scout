import fs from 'node:fs';

const source = fs.readFileSync(new URL('../services/recruiting/productionIntegrations.ts', import.meta.url), 'utf8');

if (!/configurationMode:'browser-session'/.test(source)) throw new Error('Browser sourcing must declare browser-session configuration mode');
if (!/humanActionRequired:true/.test(source)) throw new Error('Browser sourcing must disclose that human session/verification may be required');
if (!/status:'ready'\|'action-required'\|'unconfigured'/.test(source)) throw new Error('Integration health must expose an explicit readiness status');
if (!/healthStatus\(true,true\)/.test(source)) throw new Error('Browser sourcing must report action-required rather than falsely appearing ready');
if (!/const healthStatus =/.test(source)) throw new Error('Integration readiness status must be derived centrally');

const credentialProviders = ['resend','supabase','linkedin','naukri','calendar','transcription','compensation','hris'];
for (const id of credentialProviders) {
  const row = new RegExp(`id:'${id}'[\\s\\S]*?configurationMode:'credentials'[\\s\\S]*?status:healthStatus`).test(source);
  if (!row) throw new Error(`Provider ${id} must declare credentials configuration mode and explicit readiness status`);
}

console.log('provider-configuration-state-regression: ok');
