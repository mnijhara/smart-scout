import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/auditStore.ts', import.meta.url), 'utf8');

const forbidden = [
  /Unable to persist audit event: \$\{error\.message\}/,
  /Unable to load audit events: \$\{error\.message\}/,
  /Unable to count audit events: \$\{error\.message\}/,
];

const failures = forbidden
  .filter((pattern) => pattern.test(source))
  .map((pattern) => `audit provider error leaks internal details: ${pattern}`);

for (const required of [
  "const auditPersistenceError=()=>new Error('Unable to persist audit event')",
  "const auditQueryError=()=>new Error('Unable to load audit events')",
  "throw new Error('Unable to count audit events')",
]) {
  if (!source.includes(required)) failures.push(`stable audit error boundary missing: ${required}`);
}

if (failures.length) {
  console.error('Audit provider error safety regression checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit provider error safety regression checks passed.');
