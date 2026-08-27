import { readFileSync, existsSync } from 'node:fs';

// In CI, GITHUB_SHA is authoritative. SMARTSCOUT_RELEASE is only a local/deployment fallback.
const expected = process.env.GITHUB_SHA || process.env.SMARTSCOUT_RELEASE;
if (!expected) throw new Error('GITHUB_SHA or SMARTSCOUT_RELEASE is required');
if (!/^[0-9a-f]{40}$/i.test(expected)) {
  throw new Error(`Release SHA must be a full 40-character commit SHA: ${expected}`);
}

const releasePath = 'dist/release.json';
const indexPath = 'dist/index.html';
if (!existsSync(releasePath) || !existsSync(indexPath)) {
  throw new Error('Production build artifacts are missing');
}

const release = JSON.parse(readFileSync(releasePath, 'utf8'));
if (release.name !== 'smart-scout') throw new Error(`Unexpected release name: ${release.name}`);
if (!/^[0-9a-f]{40}$/i.test(release.commit)) {
  throw new Error(`Release artifact contains an invalid commit SHA: ${release.commit}`);
}
if (release.commit !== expected) {
  throw new Error(`Release SHA mismatch: artifact=${release.commit} expected=${expected}`);
}

const html = readFileSync(indexPath, 'utf8');
const match = html.match(/<meta name="smart-scout-release"[^>]*content="([^"]+)"/);
if (!match) throw new Error('smart-scout-release meta tag is missing');
if (match[1] !== expected) {
  throw new Error(`HTML release SHA mismatch: marker=${match[1]} expected=${expected}`);
}

console.log(`SmartScout release identity verified: ${expected}`);
