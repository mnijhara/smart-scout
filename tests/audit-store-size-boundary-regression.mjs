import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/auditStore.ts', import.meta.url), 'utf8');
const failures = [];

for (const required of [
  'const MAX_AUDIT_PAYLOAD_BYTES = 64 * 1024',
  'const MAX_AUDIT_EVIDENCE_BYTES = 64 * 1024',
  "serializeWithinBoundary('payload',payload,MAX_AUDIT_PAYLOAD_BYTES)",
  "serializeWithinBoundary('evidence',evidence,MAX_AUDIT_EVIDENCE_BYTES)",
  "throw new Error(`Audit event ${name} exceeds ${maxBytes} bytes`)",
]) {
  if (!source.includes(required)) failures.push(`audit size boundary missing: ${required}`);
}

if (!/JSON\.stringify\(value\)\?\?''/.test(source)) {
  failures.push('audit size boundary does not measure the serialized JSON representation');
}

if (!/catch\{throw new Error\(`Audit event \$\{name\} must be JSON serializable`\)\}/.test(source)) {
  failures.push('audit size boundary does not reject non-serializable payloads');
}

if (failures.length) {
  console.error('Audit store size boundary regression checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit store size boundary regression checks passed.');
