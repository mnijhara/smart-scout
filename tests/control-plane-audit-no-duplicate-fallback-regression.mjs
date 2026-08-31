import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');

assert.match(
  source,
  /const persisted=await persistAuditEvent\(\{tenantId,workflowId:input\.jobId\|\|null,candidateId:input\.candidateId\|\|null,eventType:action,actorType:actor,actorId:actor,payload:input\.metadata\|\|\{\}\}\);/,
  'audit writes must attempt the durable store before selecting persistence mode',
);
assert.match(
  source,
  /const persistence:AuditEvent\['persistence'\]=persisted\.persisted\?'database':'local-fallback';/,
  'audit events must expose whether durable persistence succeeded',
);
assert.match(
  source,
  /if\(!persisted\.persisted\)await append\(files\.audit,value\);return value;/,
  'local audit storage must only run when durable persistence is unavailable',
);
assert.doesNotMatch(
  source,
  /await append\(files\.audit,value\);await append\(files\.audit,value\)/,
  'successful durable audit writes must never be duplicated in local storage',
);
assert.doesNotMatch(
  source,
  /if\(persisted\.persisted\)[^{]*await append\(files\.audit,value\)/,
  'database-backed audit events must not also be written to the local fallback',
);

console.log('Control-plane audit duplicate-fallback regression passed');
