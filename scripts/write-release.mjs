import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const output = resolve(process.argv[2] || 'dist/release.json');

// CI's immutable commit identity is authoritative whenever available. Deployment
// metadata is only a fallback, preventing stale platform labels from stamping a
// release artifact that can never pass exact GitHub/live parity checks.
let commit = '';
if (process.env.CI === 'true' && process.env.GITHUB_SHA) {
  commit = process.env.GITHUB_SHA;
}
if (!commit) commit = process.env.HOSTINGER_GIT_COMMIT_SHA || '';
if (!commit) {
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    // Some deployment environments omit git metadata.
  }
}
if (!commit && process.env.SMARTSCOUT_RELEASE) {
  commit = process.env.SMARTSCOUT_RELEASE;
}
if (!/^[0-9a-f]{40}$/i.test(commit)) {
  throw new Error('Unable to determine a full 40-character SmartScout release SHA');
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ name: 'smart-scout', commit, builtAt: new Date().toISOString() }, null, 2) + '\n');

const indexPath = resolve(dirname(output), 'index.html');
try {
  let html = readFileSync(indexPath, 'utf8');
  const markerPattern = /<meta name="smart-scout-release"[^>]*>/g;
  const markers = html.match(markerPattern) || [];
  if (markers.length === 0) throw new Error('smart-scout-release meta tag missing from dist/index.html');
  if (markers.length !== 1) throw new Error(`Expected exactly one smart-scout-release meta tag, found ${markers.length}`);
  const marker = `<meta name="smart-scout-release" content="${commit}" />`;
  html = html.replace(markerPattern, marker);
  writeFileSync(indexPath, html);
} catch (error) {
  if (error.code === 'ENOENT') throw new Error('dist/index.html is missing; run the Vite build before release stamping');
  throw error;
}

console.log(`SmartScout release stamped: ${commit}`);
