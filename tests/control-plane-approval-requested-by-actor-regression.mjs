import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/api.ts', import.meta.url), 'utf8');

const gateMatch = source.match(/return requestApproval\(\{[\s\S]*?\}\);/);
assert.ok(gateMatch, 'createGate must persist approval requests through requestApproval');
assert.match(
  gateMatch[0],
  /requestedBy:\s*actorFromRequest\(req\)/,
  'approval requests must record the authenticated request actor instead of a hard-coded recruiter'
);

assert.match(
  source,
  /import \{ authenticatedTenantId, actorFromRequest \} from '\.\/firebaseAuth\.js';/,
  'recruiting API must import the authenticated actor resolver for approval persistence'
);

console.log('Control-plane approval actor regression checks passed.');
