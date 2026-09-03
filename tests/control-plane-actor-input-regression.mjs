import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const source = await readFile(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');
const routerSource = source.slice(source.indexOf('export function createControlPlaneRouter'));

assert.match(
  routerSource,
  /decideApproval\(String\(req\.params\.id\),req\.body\?\.status,actor,req\.body\?\.note,tenant\)/,
  'approval decisions must pass the server-derived actor to persistence',
);
assert.doesNotMatch(
  routerSource,
  /decideApproval\([^\n]*req\.body\?\.actor/,
  'approval decisions must never accept actor identity from the request body',
);
assert.match(
  routerSource,
  /const actor=String\(\(req as any\)\.workspaceIdentity\?\.email\|\|tenant\)/,
  'approval actor must come from authenticated workspace identity with tenant fallback',
);
assert.match(
  routerSource,
  /actor:String\(\(req as any\)\.workspaceIdentity\?\.email\|\|resolveTenant\(req\)\)/,
  'audit actor must come from authenticated workspace identity with tenant fallback',
);

console.log('Control-plane actor identity cannot be supplied by request input.');
