import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/api.ts', import.meta.url), 'utf8');

for (const stateType of ['decision', 'compensation', 'offer', 'engagement', 'onboarding']) {
  const pattern = new RegExp(`saveHiringState\\(tenantId\\(req\\), jobId, '${stateType}'`);
  const match = source.match(pattern);
  assert.ok(match, `expected ${stateType} lifecycle route to persist hiring state`);

  const callStart = match.index;
  const call = source.slice(callStart, source.indexOf(');', callStart) + 2);
  assert.match(
    call,
    /actorFromRequest\(req\)/,
    `${stateType} lifecycle persistence must receive the authenticated actor from the request`
  );
}

assert.match(
  source,
  /function actorFromRequest\(req: any\)/,
  'recruiting API must derive lifecycle actor from authenticated workspace identity'
);

console.log('Hiring lifecycle route actor propagation regression checks passed.');
