import { readFile } from 'node:fs/promises';

const workflow = await readFile('.github/workflows/production-gates.yml', 'utf8');

const required = [
  /name:\s*SmartScout Production Gates/,
  /push:\s*\n\s*branches:\s*\[main\]/,
  /pull_request:\s*\n\s*branches:\s*\[main\]/,
  /run:\s*npm run verify:migrations/,
  /run:\s*node tests\/migration-verifier-hiring-state-integrity-regression\.mjs/,
  /run:\s*node tests\/hiring-state-tenant-integrity-migration-order-regression\.mjs/,
  /run:\s*node tests\/hiring-state-atomic-audit-migration-regression\.mjs/,
];

for (const pattern of required) {
  if (!pattern.test(workflow)) {
    throw new Error(`Production migration gate contract missing: ${pattern}`);
  }
}

console.log('Production gates migration contract regression passed.');
