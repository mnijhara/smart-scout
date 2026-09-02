import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('supabase/migrations');
const files = (await readdir(root)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();

const versions = files.map(file => Number(file.match(/^(\d+)_/)?.[1])).filter(Number.isInteger);
const duplicateVersions = versions.filter((version, index) => versions.indexOf(version) !== index);
if (duplicateVersions.length) {
  throw new Error(`Duplicate migration versions detected: ${[...new Set(duplicateVersions)].join(', ')}`);
}

for (let index = 1; index < versions.length; index += 1) {
  if (versions[index] !== versions[index - 1] + 1) {
    throw new Error(`Migration versions must remain contiguous: expected ${versions[index - 1] + 1}, found ${versions[index]}`);
  }
}

const expected = ['018_recruiting_audit_candidate_workflow_index.sql', '019_recruiting_core_rls_defense_in_depth.sql'];
for (const file of expected) {
  if (!files.includes(file)) throw new Error(`Missing latest recruiting migration: ${file}`);
}

const expectedVersions = expected.map(file => Number(file.match(/^(\d+)_/)?.[1]));
if (expectedVersions[1] !== expectedVersions[0] + 1) {
  throw new Error(`Latest recruiting migrations must remain sequential: ${expected.join(', ')}`);
}

const auditIndex = await readFile(path.join(root, expected[0]), 'utf8');
if (!/create\s+index\s+if\s+not\s+exists\s+recruiting_audit_events_tenant_workflow_candidate_created_at_idx/i.test(auditIndex)) {
  throw new Error('Audit tenant/workflow/candidate index is not declared idempotently');
}
if (!/tenant_id\s*,\s*workflow_id\s*,\s*candidate_id\s*,\s*created_at\s+desc/i.test(auditIndex)) {
  throw new Error('Audit index does not preserve tenant/workflow/candidate/created_at ordering');
}

const defense = await readFile(path.join(root, expected[1]), 'utf8');
for (const table of ['hiring_workflows', 'recruiting_candidates']) {
  const enable = new RegExp(`alter\\s+table\\s+if\\s+exists\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
  const force = new RegExp(`alter\\s+table\\s+if\\s+exists\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i');
  if (!enable.test(defense) || !force.test(defense)) {
    throw new Error(`Defense-in-depth RLS is incomplete for ${table}`);
  }
}
if (!/Intentionally create no permissive policies/i.test(defense)) {
  throw new Error('Defense-in-depth migration must explicitly deny unconfigured non-service clients');
}

console.log('Latest recruiting migration hardening regression passed');
