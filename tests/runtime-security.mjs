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

// Recruiting workspace APIs intentionally support a signed, server-issued guest workspace
// for the private workspace bootstrap. Verify that boundary instead of treating guest
// bootstrap as unauthenticated access. Firebase-only control-plane APIs must still reject it.
const jobsResponse = await expectStatus('/api/recruiting/jobs', 200);
const workspaceCookie = jobsResponse.headers.get('set-cookie') || '';
if (!workspaceCookie.includes('smartscout_workspace=')) {
  throw new Error('guest workspace bootstrap did not issue a signed workspace cookie');
}

const aiStatusResponse = await expectStatus('/api/recruiting/ai/status', 200);
if (!aiStatusResponse.headers.get('content-type')?.includes('application/json')) {
  throw new Error('AI status endpoint did not return JSON');
}

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

let rateLimitResponse = null;
for (let i = 0; i < 190; i += 1) {
  const response = await fetch(`${baseUrl}/api/recruiting/health`, { headers: { accept: 'application/json' } });
  if (response.status === 429) {
    rateLimitResponse = response;
    break;
  }
}
if (!rateLimitResponse) throw new Error('API rate limiter did not return 429 after the configured threshold');

const retryAfter = Number(rateLimitResponse.headers.get('retry-after'));
const rateLimitLimit = Number(rateLimitResponse.headers.get('ratelimit-limit'));
const rateLimitRemaining = Number(rateLimitResponse.headers.get('ratelimit-remaining'));
const rateLimitReset = Number(rateLimitResponse.headers.get('ratelimit-reset'));
if (!Number.isInteger(retryAfter) || retryAfter < 1) {
  throw new Error('rate-limited API response must publish a positive integer Retry-After');
}
if (!Number.isInteger(rateLimitLimit) || rateLimitLimit < 1) {
  throw new Error('rate-limited API response must publish a positive RateLimit-Limit');
}
if (!Number.isInteger(rateLimitRemaining) || rateLimitRemaining !== 0) {
  throw new Error('rate-limited API response must publish zero RateLimit-Remaining');
}
const nowEpochSeconds = Math.floor(Date.now() / 1000);
if (!Number.isInteger(rateLimitReset) || rateLimitReset < nowEpochSeconds) {
  throw new Error('rate-limited API response must publish a future RateLimit-Reset timestamp');
}
if (rateLimitReset - nowEpochSeconds > retryAfter + 1) {
  throw new Error('RateLimit-Reset must not outlive Retry-After beyond clock rounding');
}
if (!rateLimitResponse.headers.get('retry-after')) {
  throw new Error('rate-limited API response did not include Retry-After');
}
if (rateLimitResponse.headers.get('content-type') && !rateLimitResponse.headers.get('content-type').includes('application/json')) {
  throw new Error('rate-limited API response should remain JSON');
}

console.log('RUNTIME_SECURITY_E2E_OK');
