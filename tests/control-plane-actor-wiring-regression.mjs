import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');

const requiredActorBoundaries = [
  ['approval decision actor', /const actor=String\(\(req as any\)\.workspaceIdentity\?\.email\|\|tenant\)/],
  ['audit actor', /actor:String\(\(req as any\)\.workspaceIdentity\?\.email\|\|resolveTenant\(req\)\)/],
  ['schedule actor', /const actor=String\(\(req as any\)\.workspaceIdentity\?\.email\|\|tenant\)/],
];

const failures = requiredActorBoundaries
  .filter(([, pattern]) => !pattern.test(source))
  .map(([label]) => `${label}: workspace actor boundary is missing`);

if (failures.length) {
  console.error('Control-plane actor wiring regression checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Control-plane actor wiring regression checks passed.');
