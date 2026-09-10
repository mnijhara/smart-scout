import { readFile } from 'node:fs/promises';

const workflow = await readFile(new URL('../.github/workflows/candidate-score-regressions.yml', import.meta.url), 'utf8');

const requiredRegressions = [
  'candidate-lifecycle-score-noop-regression.mjs',
  'candidate-lifecycle-score-size-boundary-regression.mjs',
  'candidate-lifecycle-score-input-boundary-regression.mjs',
  'candidate-lifecycle-score-tenant-guard-regression.mjs',
];

const steps = [...workflow.matchAll(/run: node tests\/(candidate-lifecycle-score-[^\s]+\.mjs)/g)].map((match) => match[1]);

if (steps.length !== requiredRegressions.length) {
  throw new Error(`candidate score CI workflow must run exactly ${requiredRegressions.length} node regression steps; found ${steps.length}`);
}

if (new Set(steps).size !== steps.length) {
  throw new Error('candidate score CI workflow contains duplicate lifecycle regression steps');
}

for (const [index, regression] of requiredRegressions.entries()) {
  if (steps[index] !== regression) {
    throw new Error(`candidate score CI workflow regression order drifted at step ${index + 1}: expected ${regression}, found ${steps[index] ?? 'missing'}`);
  }
}

console.log('Candidate score CI coverage regression passed.');
