const baseUrl = process.env.SMARTSCOUT_API_URL || 'http://127.0.0.1:3000';

async function expectStatus(path, expected) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { accept: 'application/json' } });
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(`${path}: expected ${expected}, received ${response.status}: ${body.slice(0, 500)}`);
  }
}

await expectStatus('/api/recruiting/health', 200);
await expectStatus('/api/recruiting/jobs', 401);
await expectStatus('/api/recruiting/ai/status', 401);
await expectStatus('/api/control-plane/approvals', 401);

console.log('RUNTIME_SECURITY_E2E_OK');
