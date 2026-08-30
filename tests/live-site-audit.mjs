const baseUrl = (process.env.LIVE_URL || 'https://smartscout.online').replace(/\/$/, '');
const expectedCommit = process.env.EXPECTED_COMMIT || process.env.GITHUB_SHA || '';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(path, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`, { redirect: 'follow' });
      if (response.ok) return response;
      const body = await response.text();
      lastError = new Error(`${path} returned HTTP ${response.status}: ${body.slice(0, 160).replace(/\s+/g, ' ')}`);
      if (response.status < 500 || attempt === attempts) throw lastError;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    }
    await sleep(1500 * attempt);
  }
  throw lastError;
}

// This job validates the network/static contract only. Client-rendered UI and
// button behavior belong to the Playwright live-public-e2e workflow; asserting
// React text against the raw HTML response creates false negatives on SPA hosts.
const publicPages = ['/', '/hire'];
for (const path of publicPages) {
  const response = await get(path);
  const html = await response.text();
  if (!/<title>[^<]*Smart Scout/i.test(html)) throw new Error(`${path} is missing a Smart Scout title`);
  if (!/viewport[^>]+width=device-width/i.test(html)) throw new Error(`${path} is missing a responsive viewport`);
  if (!/root|app/i.test(html)) throw new Error(`${path} does not contain an application mount point`);
}

const health = await get('/api/recruiting/health');
const healthPayload = await health.json();
if (healthPayload?.ok !== true) throw new Error('Recruiting health endpoint is not healthy');

const unauthenticatedApi = await fetch(`${baseUrl}/api/recruiting/session`, { redirect: 'follow' });
if (unauthenticatedApi.status !== 401 && unauthenticatedApi.status !== 403) {
  throw new Error(`/api/recruiting/session should reject unauthenticated access, got HTTP ${unauthenticatedApi.status}`);
}

const release = await get('/release.json');
const contentType = String(release.headers.get('content-type') || '').toLowerCase();
if (!contentType.includes('application/json')) {
  throw new Error(`/release.json must be served as JSON, got content-type ${contentType || 'missing'}`);
}
const payload = await release.json();
if (!/^[0-9a-f]{40}$/i.test(payload?.commit || '')) {
  throw new Error(`Live release.json has no full commit SHA: ${payload?.commit || 'missing'}`);
}
if (expectedCommit && payload.commit.toLowerCase() !== expectedCommit.toLowerCase()) {
  throw new Error(`LIVE_BUILD_MISMATCH: expected ${expectedCommit}, live ${payload.commit}`);
}

console.log(`Live static/security audit passed: ${baseUrl}`);
console.log(`Recruiting health: ${healthPayload.version || 'unknown'}`);
console.log(`Live release SHA: ${payload.commit}`);
