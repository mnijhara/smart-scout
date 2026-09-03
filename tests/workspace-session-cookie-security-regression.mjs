import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authSource = await readFile(new URL('../services/recruiting/firebaseAuth.ts', import.meta.url), 'utf8');

assert.match(
  authSource,
  /const SESSION_COOKIE = 'smartscout_workspace';/,
  'workspace session cookie name must remain stable',
);
assert.match(
  authSource,
  /const MAX_COOKIE_VALUE_LENGTH = 512;/,
  'workspace session cookies must have a bounded value length',
);
assert.match(
  authSource,
  /;\s*Path=\/;\s*Max-Age=\$\{SESSION_MAX_AGE\};\s*HttpOnly;\s*Secure;\s*SameSite=Lax`/,
  'workspace session cookies must be HttpOnly, Secure, path-scoped, and SameSite=Lax',
);
assert.match(
  authSource,
  /if\s*\(signature\.length\s*!==\s*expected\.length\s*\|\|\s*!timingSafeEqual\(Buffer\.from\(signature\),\s*Buffer\.from\(expected\)\)\)\s*return null;/,
  'workspace session signatures must use constant-time comparison',
);
assert.match(
  authSource,
  /if\s*\(!Number\.isSafeInteger\(expiresAt\)\s*\|\|\s*expiresAt\s*<=\s*Date\.now\(\)\)\s*return null;/,
  'expired or malformed workspace sessions must be rejected',
);

console.log('Workspace session cookie security regression passed');
