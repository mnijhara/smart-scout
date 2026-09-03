import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/firebaseAuth.ts', import.meta.url), 'utf8');

assert.match(source, /export type FirebaseIdentity = .*role\?:string/);
assert.match(source, /export type WorkspaceIdentity = .*role\?:string/);
assert.match(source, /customAttributes/);
assert.match(source, /JSON\.parse\(user\.customAttributes\)/);
assert.match(source, /raw\?\.role/);
assert.match(source, /role:extractFirebaseRole\(user\)/);
assert.match(source, /role:identity\.role/);

console.log('Firebase role claim propagation regression passed.');
