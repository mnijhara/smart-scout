import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');
const router = source.slice(source.indexOf('export function createControlPlaneRouter'));

for (const endpoint of [
  "r.post('/approvals'",
  "r.post('/approvals/:id/decision'",
  "r.post('/audit'",
  "r.post('/schedules'",
  "r.post('/schedules/:id/status'",
]) {
  const index = router.indexOf(endpoint);
  assert.notEqual(index, -1, `${endpoint} must remain mounted`);
  const next = router.indexOf("r.", index + endpoint.length);
  const handler = router.slice(index, next === -1 ? undefined : next);
  assert.match(
    handler,
    /actorFromRequest\(req\)/,
    `${endpoint} must derive its actor from authenticated workspace identity`,
  );
}

assert.match(
  router,
  /const actorFromRequest\s*=\s*\(req:any\)=>requiredIdentity\(/,
  'mutating control-plane routes must use the authenticated-actor guard',
);
assert.doesNotMatch(
  router,
  /requestedBy:\s*req\.body\?\.(?:requestedBy|requester|actor)/,
  'approval requester identity must never be sourced from request input',
);

console.log('control-plane mutating actor required regression passed');
