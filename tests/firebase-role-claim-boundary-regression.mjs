import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/firebaseAuth.ts', import.meta.url), 'utf8');

assert.match(source, /MAX_FIREBASE_ROLE_LENGTH\s*=\s*64/);
assert.match(source, /role\.length\s*<=\s*MAX_FIREBASE_ROLE_LENGTH/);
assert.match(source, /role\.trim\(\)\.toLowerCase\(\)/);

console.log('Firebase role claim boundary regression passed.');
