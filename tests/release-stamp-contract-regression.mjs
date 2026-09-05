import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('scripts/write-release.mjs', 'utf8');

assert.match(source, /process\.env\.CI\s*===\s*['"]true['"]/,'Release stamping must recognize CI execution');
assert.match(source, /process\.env\.GITHUB_SHA/,'Release stamping must read GitHub\'s immutable SHA');
assert.match(source, /if\s*\(!commit\)\s*commit\s*=\s*process\.env\.HOSTINGER_GIT_COMMIT_SHA/,'Deployment metadata must remain only a fallback');
assert.match(source, /<meta name=\\"smart-scout-release\\" content=\\"\$\{commit\}/,'HTML must receive the same release SHA as release.json');
assert.match(source, /JSON\.stringify\(\{\s*name:\s*['"]smart-scout['"]\s*,\s*commit\s*,/s,'release.json must persist the exact release SHA');
assert.match(source, /\^\[0-9a-f\]\{40\}\$\/i/,'Release SHA must be a full 40-character hexadecimal commit');

console.log('Release stamp contract regression passed');
