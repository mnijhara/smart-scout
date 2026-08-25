const baseUrl = process.env.SMARTSCOUT_API_URL || 'http://127.0.0.1:3000';

async function expectStatus(path, expected, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { accept: 'application/json', ...(options.headers || {}) }, ...options });
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(`${path}: expected ${expected}, received ${response.status}: ${body.slice(0, 500)}`);
  }
  return response;
}

await expectStatus('/api/recruiting/health', 200);
await expectStatus('/api/recruiting/jobs', 401);
await expectStatus('/api/recruiting/ai/status', 401);
await expectStatus('/api/control-plane/approvals', 401);

const requestId = 'runtime-security-fixed-request-id';
const requestIdResponse = await expectStatus('/api/recruiting/health', 200, { headers: { 'x-request-id': requestId } });
if (requestIdResponse.headers.get('x-request-id') !== requestId) {
  throw new Error('request correlation id was not preserved');
}

const headerChecks = [
  ['x-content-type-options', 'nosniff'],
  ['x-frame-options', 'SAMEORIGIN'],
  ['referrer-policy', 'strict-origin-when-cross-origin'],
];
for (const [name, expected] of headerChecks) {
  const response = await expectStatus('/api/recruiting/health', 200);
  if (response.headers.get(name) !== expected) throw new Error(`${name}: expected ${expected}`);
}

let rateLimited = false;
for (let i = 0; i < 190; i += 1) {
  const response = await fetch(`${baseUrl}/api/recruiting/health`, { headers: { accept: 'application/json' } });
  if (response.status === 429) {
    rateLimited = true;
    break;
  }
}
if (!rateLimited) throw new Error('API rate limiter did not return 429 after the configured threshold');

console.log('RUNTIME_SECURITY_E2E_OK');
