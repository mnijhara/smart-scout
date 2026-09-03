import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');

assert.match(
  source,
  /const actor=actorFromRequest\(req\);res\.json\(await requestApproval\(\{\.\.\.req\.body,tenantId:tenant,requestedBy:actor\}\)\)/,
  'approval requester must be derived from authenticated workspace identity rather than request input',
);
assert.match(
  source,
  /const actorFromRequest=\(req:any\)=>requiredIdentity\(String\(\(req as any\)\.workspaceIdentity\?\.email\|\|\(req as any\)\.workspaceIdentity\?\.id\|\|''\),'Authenticated actor'\)/,
  'approval requester must require an authenticated actor identity',
);

console.log('control-plane approval requester input regression passed');
