const liveUrl = (process.env.LIVE_URL || 'https://smartscout.online/').replace(/\/$/, '');
const expected = process.env.GITHUB_SHA;
const REQUEST_TIMEOUT_MS = 15000;

if (!expected || !/^[0-9a-f]{40}$/i.test(expected)) {
  throw new Error('GITHUB_SHA must be a full 40-character commit SHA for live release verification');
}

async function getResponse(path) {
  const response = await fetch(`${liveUrl}${path}`, {
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response;
}

const htmlResponse = await getResponse('/');
const html = await htmlResponse.text();
const marker = html.match(/<meta\s+name=["']smart-scout-release["'][^>]*content=["']([^"']+)["']/i)?.[1];
if (!marker) throw new Error('Live HTML is missing the smart-scout-release marker');

const releaseResponse = await getResponse('/release.json');
const contentType = releaseResponse.headers.get('content-type') || '';
if (!contentType.toLowerCase().includes('application/json')) {
  throw new Error(`Live /release.json must be served as JSON, received content-type=${contentType || 'missing'}`);
}

const release = JSON.parse(await releaseResponse.text());
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
