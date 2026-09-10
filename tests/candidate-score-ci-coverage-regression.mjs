import { readFile } from 'node:fs/promises';

const workflow = await readFile(new URL('../.github/workflows/candidate-score-regressions.yml', import.meta.url), 'utf8');

const requiredRegressions = [
  'candidate-lifecycle-score-noop-regression.mjs',
  'candidate-lifecycle-score-size-boundary-regression.mjs',
  'candidate-lifecycle-score-input-boundary-regression.mjs',
  'candidate-lifecycle-score-tenant-guard-regression.mjs',
];

for (const regression of requiredRegressions) {
  if (!workflow.includes(`tests/${regression}`)) {
    throw new Error(`candidate score CI workflow is missing ${regression}`);
  }
}

const steps = [...workflow.matchAll(/run: node tests\/(candidate-lifecycle-score-[^\s]+\.mjs)/g)].map((match) => match[1]);
if (new Set(steps).size !== requiredRegressions.length) {
  throw new Error(`candidate score CI workflow must run exactly ${requiredRegressions.length} node regression steps`);
}

console.log('Candidate score CI coverage regression passed.');
