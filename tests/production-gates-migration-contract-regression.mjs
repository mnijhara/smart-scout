import { readFile } from 'node:fs/promises';

const workflow = await readFile('.github/workflows/production-gates.yml', 'utf8');
const normalizedWorkflow = workflow.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ');

const required = [
  'name: SmartScout Production Gates',
  'push:\n  branches: [main]',
  'pull_request:\n  branches: [main]',
  'run: npm run verify:migrations',
  'run: node scripts/verify-hiring-lifecycle-migration-chain.mjs',
  'run: node tests/migration-verifier-hiring-state-integrity-regression.mjs',
  'run: node tests/hiring-state-tenant-integrity-migration-order-regression.mjs',
  'run: node tests/hiring-state-atomic-audit-migration-regression.mjs',
  'run: npm run verify:release',
  'name: Verify release artifacts',
  'test -d dist/',
  'dist/release.json',
  '$GITHUB_SHA',
  'name: Verify live release identity (external, non-blocking)',
  'continue-on-error: true',
  'LIVE_URL: https://smartscout.online/',
];

for (const requiredSnippet of required) {
  const normalizedSnippet = requiredSnippet.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ');
  if (!normalizedWorkflow.includes(normalizedSnippet)) {
    throw new Error(`Production migration gate contract missing: ${requiredSnippet}`);
  }
}

console.log('Production gates migration contract regression passed.');
