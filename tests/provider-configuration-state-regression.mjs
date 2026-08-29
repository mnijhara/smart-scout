import fs from 'node:fs';

const source = fs.readFileSync(new URL('../services/recruiting/productionIntegrations.ts', import.meta.url), 'utf8');

if (!/configurationMode:'browser-session'/.test(source)) throw new Error('Browser sourcing must declare browser-session configuration mode');
if (!/humanActionRequired:true/.test(source)) throw new Error('Browser sourcing must disclose that human session/verification may be required');

const credentialProviders = ['resend','supabase','linkedin','naukri','calendar','transcription','compensation','hris'];
for (const id of credentialProviders) {
  const row = new RegExp(`id:'${id}'[\\s\\S]*?configurationMode:'credentials'`).test(source);
  if (!row) throw new Error(`Provider ${id} must declare credentials configuration mode`);
}

console.log('provider-configuration-state-regression: ok');
