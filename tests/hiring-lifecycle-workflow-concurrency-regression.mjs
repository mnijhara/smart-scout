import { readFile } from 'node:fs/promises';

const workflow = await readFile('.github/workflows/hiring-lifecycle-migration.yml', 'utf8');

const required = [
  /concurrency:\s*\n\s*group:\s*hiring-lifecycle-migration-\$\{\{\s*github\.workflow\s*\}\}-\$\{\{\s*github\.ref\s*\}\}/,
  /cancel-in-progress:\s*true/,
  /pull_request:\s*\n\s*branches:\s*\[main\]/,
  /push:\s*\n\s*branches:\s*\[main\]/,
];

for (const pattern of required) {
  if (!pattern.test(workflow)) throw new Error(`Hiring lifecycle workflow contract missing: ${pattern}`);
}

console.log('Hiring lifecycle workflow concurrency regression passed.');
