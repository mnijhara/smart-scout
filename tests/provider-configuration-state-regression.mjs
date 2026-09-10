import fs from 'node:fs';

const source = fs.readFileSync(new URL('../services/recruiting/productionIntegrations.ts', import.meta.url), 'utf8');

if (!/configurationMode:'browser-session'/.test(source)) throw new Error('Browser sourcing must declare browser-session configuration mode');
if (!/humanActionRequired:true/.test(source)) throw new Error('Browser sourcing must disclose that human session/verification may be required');
if (!/status:'ready'\|'action-required'\|'unconfigured'/.test(source)) throw new Error('Integration health must expose an explicit readiness status');
if (!/healthStatus\(true,true\)/.test(source)) throw new Error('Browser sourcing must report action-required rather than falsely appearing ready');
if (!/const healthStatus =/.test(source)) throw new Error('Integration readiness status must be derived centrally');

const credentialProviders = ['resend','supabase','linkedin','naukri','calendar','transcription','compensation','hris'];
const integrationRows = [...source.matchAll(/\{id:'([a-z-]+)',provider:/g)];
const rowById = new Map();
for (let index = 0; index < integrationRows.length; index += 1) {
  const match = integrationRows[index];
  const start = match.index;
  const end = integrationRows[index + 1]?.index ?? source.length;
  rowById.set(match[1], source.slice(start, end));
}

for (const id of credentialProviders) {
  const row = rowById.get(id);
  if (!row) throw new Error(`Provider ${id} integration health row is missing`);
  if (!/configurationMode:'credentials'/.test(row)) throw new Error(`Provider ${id} must declare credentials configuration mode`);
  if (!/status:healthStatus/.test(row)) throw new Error(`Provider ${id} must expose the centrally derived readiness status`);
}

console.log('provider-configuration-state-regression: ok');
