import { readFileSync, existsSync } from 'node:fs';

const expected = process.env.GITHUB_SHA || process.env.SMARTSCOUT_RELEASE;
if (!expected) throw new Error('GITHUB_SHA or SMARTSCOUT_RELEASE is required');

const releasePath = 'dist/release.json';
const indexPath = 'dist/index.html';
if (!existsSync(releasePath) || !existsSync(indexPath)) {
  throw new Error('Production build artifacts are missing');
}

const release = JSON.parse(readFileSync(releasePath, 'utf8'));
if (release.name !== 'smart-scout') throw new Error(`Unexpected release name: ${release.name}`);
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
