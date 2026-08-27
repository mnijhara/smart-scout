const liveUrl = (process.env.LIVE_URL || 'https://smartscout.online/').replace(/\/$/, '');
const expected = process.env.GITHUB_SHA;

if (!expected || !/^[0-9a-f]{40}$/i.test(expected)) {
  throw new Error('GITHUB_SHA must be a full 40-character commit SHA for live release verification');
}

async function getText(path) {
  const response = await fetch(`${liveUrl}${path}`, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.text();
}

const html = await getText('/');
const marker = html.match(/<meta\s+name=["']smart-scout-release["'][^>]*content=["']([^"']+)["']/i)?.[1];
if (!marker) throw new Error('Live HTML is missing the smart-scout-release marker');

const release = JSON.parse(await getText('/release.json'));
const liveSha = release?.commit;
if (!/^[0-9a-f]{40}$/i.test(marker) || !/^[0-9a-f]{40}$/i.test(liveSha || '')) {
  throw new Error(`Live release identity is malformed: marker=${marker} release.json=${liveSha}`);
}
if (marker !== liveSha) {
  throw new Error(`Live release identity disagrees: marker=${marker} release.json=${liveSha}`);
}
if (marker !== expected) {
  throw new Error(`Live release is not this GitHub build: live=${marker} github=${expected}`);
}

console.log(`Live SmartScout release verified: ${expected}`);
