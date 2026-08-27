const baseUrl = (process.env.LIVE_URL || 'https://smartscout.online').replace(/\/$/, '');

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response;
}

const publicChecks = [
  { path: '/', required: ['Smart Scout', 'Start hiring', 'See it work', 'Bring a real hiring need'] },
  { path: '/hire', required: ['Smart Scout', 'Command', 'JD', 'Source', 'Shortlist', 'Interview', 'Decision', 'Comp', 'Offer'] },
];

for (const check of publicChecks) {
  const response = await get(check.path);
  const html = await response.text();
  for (const text of check.required) {
    if (!html.includes(text)) throw new Error(`${check.path} is missing expected UI text: ${text}`);
  }
  if (!/<title>[^<]*Smart Scout/i.test(html)) throw new Error(`${check.path} is missing a Smart Scout title`);
  if (!/viewport[^>]+width=device-width/i.test(html)) throw new Error(`${check.path} is missing a responsive viewport`);
}

const health = await get('/api/recruiting/health');
const healthPayload = await health.json();
if (healthPayload?.ok !== true) throw new Error('Recruiting health endpoint is not healthy');

const unauthenticatedApi = await fetch(`${baseUrl}/api/recruiting/session`, { redirect: 'follow' });
if (unauthenticatedApi.status !== 401 && unauthenticatedApi.status !== 403) {
  throw new Error(`/api/recruiting/session should reject unauthenticated access, got HTTP ${unauthenticatedApi.status}`);
}

const release = await get('/release.json');
const payload = await release.json();
if (!/^[0-9a-f]{40}$/i.test(payload?.commit || '')) {
  throw new Error(`Live release.json has no full commit SHA: ${payload?.commit || 'missing'}`);
}

console.log(`Live public/security audit passed: ${baseUrl}`);
console.log(`Recruiting health: ${healthPayload.version || 'unknown'}`);
console.log(`Live release SHA: ${payload.commit}`);
