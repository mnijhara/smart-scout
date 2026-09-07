import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
let observedInit;
globalThis.fetch = async (_url, init) => {
  observedInit = init;
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

try {
  process.env.INTEGRATION_API_TOKEN = 'test-token-only';
  process.env.INTEGRATION_API_URL = 'https://integration.example.test';
  const { postJson } = await import('../services/recruiting/productionIntegrations.ts');
  await postJson('/health', { probe: true });
  assert.equal(observedInit?.redirect, 'error', 'integration requests must not follow redirects with bearer credentials');
  assert.equal(observedInit?.headers?.Authorization, 'Bearer test-token-only');
  console.log('Integration postJson redirect contract: OK');
} finally {
  globalThis.fetch = originalFetch;
  delete process.env.INTEGRATION_API_TOKEN;
  delete process.env.INTEGRATION_API_URL;
}
