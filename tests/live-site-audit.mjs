const baseUrl = (process.env.LIVE_URL || 'https://smartscout.online').replace(/\/$/, '');

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

const publicChecks = [
  {
    path: '/',
    required: ['Smart Scout', 'Start hiring', 'See it work', 'Bring a real hiring need'],
    interactive: ['Start hiring', 'See it work', 'Bring a real hiring need'],
  },
  {
    path: '/hire',
    required: ['Smart Scout', 'Command', 'JD', 'Source', 'Shortlist', 'Interview', 'Decision', 'Comp', 'Offer'],
    interactive: ['Command', 'JD', 'Source', 'Shortlist', 'Interview', 'Decision', 'Comp', 'Offer'],
  },
];

for (const check of publicChecks) {
  const response = await get(check.path);
  const html = await response.text();
  for (const text of check.required) {
    if (!html.includes(text)) throw new Error(`${check.path} is missing expected UI text: ${text}`);
  }
  for (const label of check.interactive) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const buttonPattern = new RegExp(`<button[^>]*>[^<]*${escaped}[^<]*<\\/button>|<a[^>]*>[^<]*${escaped}[^<]*<\\/a>`, 'i');
    if (!buttonPattern.test(html)) throw new Error(`${check.path} is missing an interactive control for: ${label}`);
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
