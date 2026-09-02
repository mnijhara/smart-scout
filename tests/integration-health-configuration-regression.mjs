import assert from 'node:assert/strict';
import { integrationHealth } from '../services/recruiting/productionIntegrations.ts';

const env = {
  RESEND_API_KEY: 'redacted-resend',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'redacted-supabase',
  LINKEDIN_CLIENT_ID: 'linkedin-id',
  LINKEDIN_CLIENT_SECRET: 'linkedin-secret',
  NAUKRI_CLIENT_ID: 'naukri-id',
  NAUKRI_CLIENT_SECRET: 'naukri-secret',
  CALENDAR_PROVIDER: 'calendar-test',
  CALENDAR_API_URL: 'https://calendar.example.test',
  CALENDAR_API_TOKEN: 'calendar-token',
  TRANSCRIPTION_PROVIDER: 'transcription-test',
  TRANSCRIPTION_API_URL: 'https://transcription.example.test',
  TRANSCRIPTION_API_KEY: 'transcription-key',
  COMPENSATION_PROVIDER: 'compensation-test',
  COMPENSATION_API_URL: 'https://compensation.example.test',
  COMPENSATION_API_KEY: 'compensation-key',
  HRIS_PROVIDER: 'hris-test',
  HRIS_API_URL: 'https://hris.example.test',
  HRIS_API_TOKEN: 'hris-token',
};

const configured = integrationHealth(env);
for (const integration of configured) {
  assert.equal(integration.missing.length, 0, `${integration.id} should be fully configured`);
  assert.equal(integration.configured, true, `${integration.id} should report configured`);
}

const byId = Object.fromEntries(configured.map(item => [item.id, item]));
assert.equal(byId['browser-sourcing'].humanActionRequired, true);
assert.equal(byId['browser-sourcing'].configurationMode, 'browser-session');

// Exercise genuinely partial credentials: every credential-backed provider below
// is missing at least one required value. A single Resend API key is sufficient
// for Resend, so it must not be included in this partial-configuration fixture.
const partial = integrationHealth({
  SUPABASE_URL: 'https://example.supabase.co',
  LINKEDIN_CLIENT_ID: 'linkedin-id',
  CALENDAR_API_URL: 'https://calendar.example.test',
  TRANSCRIPTION_API_KEY: 'transcription-key',
  COMPENSATION_API_URL: 'https://compensation.example.test',
  HRIS_API_TOKEN: 'hris-token',
});
const partialById = Object.fromEntries(partial.map(item => [item.id, item]));
for (const id of ['resend', 'supabase', 'linkedin', 'calendar', 'transcription', 'compensation', 'hris']) {
  assert.equal(partialById[id].configured, false, `${id} must not report configured with partial credentials`);
  assert.ok(partialById[id].missing.length > 0, `${id} must identify missing configuration`);
}

const serialized = JSON.stringify(configured);
for (const secret of Object.values(env)) {
  if (String(secret).includes('://') || String(secret).includes('-test')) continue;
  assert.equal(serialized.includes(String(secret)), false, 'provider status must not expose credential values');
}

console.log('Integration health configuration regression passed');
