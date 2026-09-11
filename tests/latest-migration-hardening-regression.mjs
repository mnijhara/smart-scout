import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('supabase/migrations');
const allSqlFiles = (await readdir(root)).filter((name) => name.endsWith('.sql'));
const invalidMigrationFiles = allSqlFiles.filter((name) => !/^\d+_.+\.sql$/.test(name));
if (invalidMigrationFiles.length) {
  throw new Error(`Migration verifier must reject malformed SQL migration filenames: ${invalidMigrationFiles.join(', ')}`);
}

const files = allSqlFiles
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort((left, right) => Number(left.match(/^(\d+)_/)?.[1]) - Number(right.match(/^(\d+)_/)?.[1]));
const versions = files.map((file) => Number(file.match(/^(\d+)_/)?.[1]));
const duplicateVersions = versions.filter((version, index) => versions.indexOf(version) !== index);
if (duplicateVersions.length) {
  throw new Error(`Duplicate migration versions detected: ${[...new Set(duplicateVersions)].join(', ')}`);
}

for (let index = 1; index < versions.length; index += 1) {
  if (versions[index] !== versions[index - 1] + 1) {
    throw new Error(`Migration versions must remain contiguous: expected ${versions[index - 1] + 1}, found ${versions[index]}`);
  }
}

const expected = [
  '020_recruiting_integration_tenant_integrity.sql',
  '021_recruiting_comparison_tenant_integrity.sql',
  '022_recruiting_interview_tenant_integrity.sql',
  '023_recruiting_audit_tenant_integrity.sql',
  '024_hiring_state_tenant_integrity.sql',
  '025_hiring_state_atomic_audit.sql',
  '026_hiring_state_rpc_input_bounds.sql',
  '027_recruiting_audit_candidate_workflow_index.sql',
  '028_recruiting_core_rls_defense_in_depth.sql',
  '029_recruiting_candidates_tenant_email_uniqueness.sql',
  '030_candidate_lifecycle_status_constraint.sql',
];
for (const file of expected) {
  if (!files.includes(file)) throw new Error(`Missing recruiting migration: ${file}`);
}
const expectedVersions = expected.map((file) => Number(file.match(/^(\d+)_/)?.[1]));
if (Math.max(...versions) !== expectedVersions.at(-1)) {
  throw new Error(`Expected recruiting migration chain to end at version ${expectedVersions.at(-1)}, found ${Math.max(...versions)}`);
}

const verifier = await readFile(path.resolve('scripts/verify-migrations.mjs'), 'utf8');
if (!/Number\.isSafeInteger\(version\)\s*\|\|\s*version\s*<\s*1/.test(verifier)) {
  throw new Error('Migration verifier must reject non-positive or unsafe migration versions');
}
if (!/Invalid migration filenames/.test(verifier) || !/name\.endsWith\('\.sql'\)/.test(verifier)) {
  throw new Error('Migration verifier must reject malformed SQL migration filenames');
}
if (!verifier.includes('Destructive protected-table drop found')) {
  throw new Error('Migration verifier must reject destructive protected-table drops');
}

const rlsDefense = await readFile(path.join(root, '028_recruiting_core_rls_defense_in_depth.sql'), 'utf8');
for (const table of ['hiring_workflows', 'recruiting_candidates']) {
  const enable = new RegExp(`alter\\s+table\\s+if\\s+exists\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
  const force = new RegExp(`alter\\s+table\\s+if\\s+exists\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i');
  if (!enable.test(rlsDefense) || !force.test(rlsDefense)) {
    throw new Error(`028 must enable and force RLS for ${table}`);
  }
}
if (/create\\s+policy/i.test(rlsDefense)) {
  throw new Error('028 must not introduce permissive client policies before tenant claims are wired');
}

const candidateEmail = await readFile(path.join(root, '029_recruiting_candidates_tenant_email_uniqueness.sql'), 'utf8');
if (!/create\\s+unique\\s+index\\s+if\\s+not\\s+exists\\s+recruiting_candidates_tenant_email_workflow_idx/i.test(candidateEmail)) {
  throw new Error('029 must enforce tenant/workflow-scoped candidate email uniqueness');
}
if (!/lower\(email\)/i.test(candidateEmail)) {
  throw new Error('029 must normalize candidate email uniqueness case-insensitively');
}

const lifecycle = await readFile(path.join(root, '030_candidate_lifecycle_status_constraint.sql'), 'utf8');
for (const status of ['discovered', 'screened', 'shortlisted', 'interview', 'selected', 'rejected', 'offered', 'accepted', 'onboarded']) {
  if (!new RegExp(`['\"]${status}['\"]`, 'i').test(lifecycle)) {
    throw new Error(`030 must preserve supported lifecycle status: ${status}`);
  }
}
for (const unsupported of ['screening', 'hired', 'completed']) {
  if (new RegExp(`['\"]${unsupported}['\"]`, 'i').test(lifecycle)) {
    throw new Error(`030 must not reintroduce unsupported lifecycle status: ${unsupported}`);
  }
}
if (!/validate\s+constraint\s+recruiting_candidates_status_check/i.test(lifecycle)) {
  throw new Error('030 must validate the candidate lifecycle constraint after creation');
}

console.log('Latest recruiting migration hardening regression passed');
