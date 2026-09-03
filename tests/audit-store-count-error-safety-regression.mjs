import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/auditStore.ts', import.meta.url), 'utf8');
const failures = [];

if (!source.includes("const auditQueryError=()=>new Error('Unable to load audit events')")) {
  failures.push('audit query error helper missing');
}

if (!/export async function countAuditEvents[\s\S]*?if\(error\)throw new Error\('Unable to count audit events'\)/.test(source)) {
  failures.push('audit count does not expose a stable client-safe error');
}

if (/countAuditEvents[\s\S]*?error\.message/.test(source)) {
  failures.push('audit count appears to expose the provider error message');
}

if (failures.length) {
  console.error('Audit store count error safety regression checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit store count error safety regression checks passed.');
