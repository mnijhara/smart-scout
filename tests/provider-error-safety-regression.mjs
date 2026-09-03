import fs from 'node:fs';
import assert from 'node:assert/strict';

const auth = fs.readFileSync(new URL('../services/recruiting/firebaseAuth.ts', import.meta.url), 'utf8');

assert.match(auth, /catch\(error:any\)\{\s*console\.error\('Firebase authentication failure:', error\);\s*res\.status\(401\)\.json\(\{error:'Authentication failed'\}\);\s*\}/s, 'Firebase auth failures must use a stable client-safe response');
assert.match(auth, /catch\(error:any\)\{\s*console\.error\('Workspace authentication failure:', error\);\s*res\.status\(401\)\.json\(\{error:'Workspace authentication failed'\}\);\s*\}/s, 'workspace auth failures must use a stable client-safe response');

const authMiddleware = auth.slice(auth.indexOf('export async function requireFirebaseAuth'));
assert.doesNotMatch(authMiddleware, /res\.status\(401\)\.json\(\{error:error\?\.message/, 'Firebase provider messages must not be returned to clients');
assert.doesNotMatch(authMiddleware, /res\.status\(401\)\.json\(\{error:error\.message/, 'workspace provider messages must not be returned to clients');

console.log('Authentication provider failures are logged server-side and returned with stable client-safe errors.');
