const baseUrl = (process.env.LIVE_URL || 'https://smartscout.online').replace(/\/$/, '');

const checks = [
  { path: '/', required: ['Smart Scout', 'Start hiring', 'See it work', 'Bring a real hiring need'] },
  { path: '/hire', required: ['Smart Scout', 'Command', 'JD', 'Source', 'Shortlist', 'Interview', 'Decision', 'Comp', 'Offer'] },
];

for (const check of checks) {
  const response = await fetch(`${baseUrl}${check.path}`, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${check.path} returned HTTP ${response.status}`);
  const html = await response.text();
  for (const text of check.required) {
    if (!html.includes(text)) throw new Error(`${check.path} is missing expected UI text: ${text}`);
  }
  if (!/<title>[^<]*Smart Scout/i.test(html)) throw new Error(`${check.path} is missing a Smart Scout title`);
  if (!/viewport[^>]+width=device-width/i.test(html)) throw new Error(`${check.path} is missing a responsive viewport`);
}

const release = await fetch(`${baseUrl}/release.json`, { redirect: 'follow' });
if (!release.ok) throw new Error(`/release.json returned HTTP ${release.status}`);
const payload = await release.json();
if (!/^[0-9a-f]{40}$/i.test(payload?.commit || '')) {
  throw new Error(`Live release.json has no full commit SHA: ${payload?.commit || 'missing'}`);
}

console.log(`Live public site audit passed: ${baseUrl}`);
console.log(`Live release SHA: ${payload.commit}`);
