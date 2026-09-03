import fs from 'node:fs';
import assert from 'node:assert/strict';

const auth = fs.readFileSync(new URL('../services/recruiting/firebaseAuth.ts', import.meta.url), 'utf8');

assert.match(auth, /const MAX_FIREBASE_TOKEN_LENGTH = 4096;/, 'Firebase authentication must cap token size before provider lookup');
assert.match(auth, /if\(!token\.trim\(\) \|\| token\.length > MAX_FIREBASE_TOKEN_LENGTH\)throw new Error\('Invalid Firebase authentication token'\);/, 'empty, whitespace-only, and oversized Firebase tokens must be rejected locally');
assert.match(auth, /catch\(error:any\)\{\s*console\.error\('Firebase authentication failure:', error\);\s*res\.status\(401\)\.json\(\{error:'Authentication failed'\}\);\s*\}/s, 'Firebase auth failures must use a stable client-safe response');
assert.match(auth, /catch\(error:any\)\{\s*console\.error\('Workspace authentication failure:', error\);\s*res\.status\(401\)\.json\(\{error:'Workspace authentication failed'\}\);\s*\}/s, 'workspace auth failures must use a stable client-safe response');

const authMiddleware = auth.slice(auth.indexOf('export async function requireFirebaseAuth'));
assert.doesNotMatch(authMiddleware, /res\.status\(401\)\.json\(\{error:error\?\.message/, 'Firebase provider messages must not be returned to clients');
assert.doesNotMatch(authMiddleware, /res\.status\(401\)\.json\(\{error:error\.message/, 'workspace provider messages must not be returned to clients');

console.log('Authentication provider failures are safe and invalid Firebase tokens are rejected before provider lookup.');
