import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/firebaseAuth.ts', import.meta.url), 'utf8');

assert.match(
  source,
  /export function actorFromRequest\(req:Request\):string/, 
  'firebase auth must expose a centralized authenticated actor resolver'
);
assert.match(
  source,
  /workspaceIdentity[^\n]*as WorkspaceIdentity/, 
  'actor resolver must prefer the authenticated workspace identity'
);
assert.match(
  source,
  /firebaseUser[^\n]*as FirebaseIdentity/, 
  'actor resolver must support the authenticated Firebase identity fallback'
);
assert.match(
  source,
  /throw new Error\('Workspace identity is missing'\)/,
  'actor resolver must fail closed when no authenticated identity exists'
);

console.log('Firebase authenticated actor resolution regression checks passed.');
