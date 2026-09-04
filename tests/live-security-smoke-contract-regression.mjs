import { readFile } from 'node:fs/promises';
import path from 'node:path';

const source = await readFile(path.resolve('tests/live-security-smoke.mjs'), 'utf8');

if (!source.includes('AbortController')) {
  throw new Error('Live security smoke must use an abortable request boundary');
}
if (!/const timeoutMs = 15_000/.test(source)) {
  throw new Error('Live security smoke must enforce a finite 15 second request timeout');
}
if (!source.includes('Live security smoke could not reach')) {
  throw new Error('Live security smoke must expose reachability failures with actionable context');
}
if (!source.includes('x-content-type-options') || !source.includes('x-frame-options')) {
  throw new Error('Live security smoke must retain core security-header assertions');
}
if (!source.includes('Origin: \'https://attacker.invalid\'')) {
  throw new Error('Live security smoke must retain cross-origin request protection coverage');
}

console.log('Live security smoke contract regression passed');
