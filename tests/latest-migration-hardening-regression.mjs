import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('supabase/migrations');
const allSqlFiles = (await readdir(root)).filter(name => name.endsWith('.sql'));
const invalidMigrationFiles = allSqlFiles.filter(name => !/^\d+_.+\.sql$/.test(name));
if (invalidMigrationFiles.length) {
  throw new Error(`Migration verifier must reject malformed SQL migration filenames: ${invalidMigrationFiles.join(', ')}`);
}
const files = allSqlFiles
  .filter(name => /^\d+_.+\.sql$/.test(name))
  .sort((left, right) => Number(left.match(/^(\d+)_/)?.[1]) - Number(right.match(/^(\d+)_/)?.[1]) || left.localeCompare(right));

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

const verifier = await readFile(path.resolve('scripts/verify-migrations.mjs'), 'utf8');
if (!/Number\.isSafeInteger\(version\)\s*\|\|\s*version\s*<\s*1/.test(verifier)) {
  throw new Error('Migration verifier must reject non-positive or unsafe migration versions');
}
if (!/Invalid migration filenames/.test(verifier) || !/name\.endsWith\('\.sql'\)/.test(verifier)) {
  throw new Error('Migration verifier must reject SQL files that do not follow the versioned filename convention');
}
if (!verifier.includes('(?:IF\\s+EXISTS\\s+)?') || !verifier.includes('Destructive protected-table drop found')) {
  throw new Error('Migration verifier must reject protected-table drops whether or not IF EXISTS is used');
}

const expected = [
  '020_recruiting_integration_tenant_integrity.sql',
  '021_recruiting_comparison_tenant_integrity.sql',
  '022_recruiting_interview_tenant_integrity.sql',
];
for (const file of expected) {
  if (!files.includes(file)) throw new Error(`Missing latest recruiting migration: ${file}`);
}

const expectedVersions = expected.map(file => Number(file.match(/^(\d+)_/)?.[1]));
for (let index = 1; index < expectedVersions.length; index += 1) {
  if (expectedVersions[index] !== expectedVersions[index - 1] + 1) {
    throw new Error(`Latest recruiting migrations must remain sequential: ${expected.join(', ')}`);
  }
}

const integrationTenant = await readFile(path.join(root, expected[0]), 'utf8');
for (const table of ['recruiting_documents', 'recruiting_knockout_results']) {
  const force = new RegExp(`alter\\s+table\\s+${table}\\s+force\\s+row\\s+level\\s+security`, 'i');
  if (!force.test(integrationTenant)) {
    throw new Error(`Integration tenant migration must force RLS for ${table}`);
  }
}

const comparisonTenant = await readFile(path.join(root, expected[1]), 'utf8');
if (!/recruiting_comparisons_tenant_job_fk[\s\S]*foreign\s+key\s*\(tenant_id\s*,\s*job_id\)[\s\S]*references\s+hiring_workflows\s*\(tenant_id\s*,\s*id\)[\s\S]*not\s+valid/i.test(comparisonTenant)) {
  throw new Error('Comparison tenant migration must bind job identity to the same tenant');
}
if (!/recruiting_comparisons_tenant_job_fk_idx/i.test(comparisonTenant)) {
  throw new Error('Comparison tenant migration must index its tenant/job foreign key');
}

const interviewTenant = await readFile(path.join(root, expected[2]), 'utf8');
for (const relation of [
  /recruiting_interviews_tenant_workflow_fk[\s\S]*foreign\s+key\s*\(tenant_id\s*,\s*workflow_id\)[\s\S]*references\s+public\.hiring_workflows\s*\(tenant_id\s*,\s*id\)[\s\S]*not\s+valid/i,
  /recruiting_interviews_tenant_candidate_fk[\s\S]*foreign\s+key\s*\(tenant_id\s*,\s*candidate_id\)[\s\S]*references\s+public\.recruiting_candidates\s*\(tenant_id\s*,\s*id\)[\s\S]*not\s+valid/i,
]) {
  if (!relation.test(interviewTenant)) throw new Error('Interview tenant migration must preserve same-tenant workflow/candidate identity');
}
if (!/recruiting_interviews_tenant_workflow_fk_idx/i.test(interviewTenant) || !/recruiting_interviews_tenant_candidate_fk_idx/i.test(interviewTenant)) {
  throw new Error('Interview tenant migration must index both tenant foreign keys');
}
if (!/alter\s+table\s+if\s+exists\s+public\.recruiting_interviews\s+force\s+row\s+level\s+security/i.test(interviewTenant)) {
  throw new Error('Interview tenant migration must force RLS');
}

console.log('Latest recruiting migration hardening regression passed');
