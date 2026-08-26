import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const output = resolve(process.argv[2] || 'dist/release.json');
let commit = process.env.SMARTSCOUT_RELEASE || process.env.GITHUB_SHA || process.env.HOSTINGER_GIT_COMMIT_SHA || '';
if (!commit) {
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* deployment may not include git metadata */ }
}
if (!commit) throw new Error('Unable to determine SmartScout release SHA');

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
