const baseUrl = (process.env.SMARTSCOUT_BASE_URL || 'https://smartscout.online').replace(/\/$/, '');

const homepage = await fetch(baseUrl, { redirect: 'manual' });
if (homepage.status !== 200) throw new Error(`Homepage returned ${homepage.status}`);

const requiredHeaders = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': /camera=\(\), geolocation=\(\), payment=\(self\), microphone=\(\)/,
};
for (const [name, expected] of Object.entries(requiredHeaders)) {
  const actual = homepage.headers.get(name) || '';
  if (expected instanceof RegExp ? !expected.test(actual) : actual !== expected) {
    throw new Error(`Missing/incorrect ${name}: ${actual}`);
  }
}

const health = await fetch(`${baseUrl}/api/recruiting/health`);
if (health.status !== 200) throw new Error(`Recruiting health returned ${health.status}`);
const healthBody = await health.json();
if (healthBody?.ok !== true || healthBody?.service !== 'smartscout-recruiting') {
  throw new Error(`Unexpected health response: ${JSON.stringify(healthBody)}`);
}

const crossOrigin = await fetch(`${baseUrl}/api/recruiting/health`, {
  method: 'POST',
  headers: { Origin: 'https://attacker.invalid', 'Content-Type': 'application/json' },
  body: '{}',
});
if (crossOrigin.status !== 403 && crossOrigin.status !== 405) {
  throw new Error(`Unexpected cross-origin POST status: ${crossOrigin.status}`);
}

console.log(`LIVE_SECURITY_SMOKE_OK ${baseUrl}`);
