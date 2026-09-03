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
  /; Path=\/; Max-Age=\$\{SESSION_MAX_AGE\}; HttpOnly; Secure; SameSite=Lax`/,
  'workspace session cookies must be HttpOnly, Secure, path-scoped, and SameSite=Lax',
);
assert.match(
  authSource,
  /if\(signature\.length !== expected\.length \|\| !timingSafeEqual\(Buffer\.from\(signature\),Buffer\.from\(expected\)\)\)return null;/,
  'workspace session signatures must use constant-time comparison',
);
assert.match(
  authSource,
  /if\(!Number\.isSafeInteger\(expiresAt\) \|\| expiresAt <= Date\.now\(\)\)return null;/,
  'expired or malformed workspace sessions must be rejected',
);

console.log('Workspace session cookie security regression passed');
