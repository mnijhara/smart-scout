import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const output = resolve(process.argv[2] || 'dist/release.json');

// Deployment platforms may expose their checkout SHA directly. Prefer that over
// a manually configured release label so production can never stamp an old build.
let commit = process.env.HOSTINGER_GIT_COMMIT_SHA || '';
if (!commit && process.env.CI === 'true' && process.env.GITHUB_SHA) {
  commit = process.env.GITHUB_SHA;
}
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
  const marker = `<meta name="smart-scout-release" content="${commit}" />`;
  if (!/<meta name="smart-scout-release"/.test(html)) throw new Error('smart-scout-release meta tag missing from dist/index.html');
  html = html.replace(/<meta name="smart-scout-release"[^>]*>/, marker);
  writeFileSync(indexPath, html);
} catch (error) {
  if (error.code === 'ENOENT') throw new Error('dist/index.html is missing; run the Vite build before release stamping');
  throw error;
}

console.log(`SmartScout release stamped: ${commit}`);
