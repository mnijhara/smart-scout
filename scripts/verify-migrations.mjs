import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('supabase/migrations');
const allSqlFiles = (await readdir(root)).filter(name => name.endsWith('.sql'));
const invalidMigrationFiles = allSqlFiles.filter(name => !/^\d+_.+\.sql$/.test(name));
if (invalidMigrationFiles.length) throw new Error(`Invalid migration filenames: ${invalidMigrationFiles.join(', ')}`);
const files = allSqlFiles
  .filter(name => /^\d+_.+\.sql$/.test(name))
  .sort((left, right) => Number(left.match(/^(\d+)_/)?.[1]) - Number(right.match(/^(\d+)_/)?.[1]) || left.localeCompare(right));
if (!files.length) throw new Error('No Supabase migrations found');
const versions = files.map(name => Number(name.split('_', 1)[0]));
if (versions.some(version => !Number.isSafeInteger(version) || version < 1)) throw new Error('Migration versions must be positive safe integers');
const duplicates = versions.filter((v, i) => versions.indexOf(v) !== i);
if (duplicates.length) throw new Error(`Duplicate migration versions: ${[...new Set(duplicates)].join(', ')}`);
for (let i = 1; i < versions.length; i++) if (versions[i] !== versions[i - 1] + 1) throw new Error(`Migration sequence gap between ${versions[i - 1]} and ${versions[i]}`);
for (const file of files) {
  const sql = await readFile(path.join(root, file), 'utf8');
  if (!sql.trim()) throw new Error(`Empty migration: ${file}`);
  if (/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?public\.(hiring_workflows|recruiting_candidates|recruiting_audit_events|recruiting_interviews)/i.test(sql)) throw new Error(`Destructive protected-table drop found in ${file}`);
}

const lifecycleMigration = await readFile(path.join(root, '007_hiring_state_persistence.sql'), 'utf8');
const requiredLifecycleGuards = [
  /create\s+or\s+replace\s+function\s+public\.validate_hiring_state_tenant/i,
  /language\s+plpgsql/i,
  /security\s+definer/i,
  /set\s+search_path\s*=\s*public/i,
  /create\s+trigger\s+hiring_state_history_tenant_guard/i,
  /before\s+insert\s+or\s+update\s+on\s+public\.hiring_state_history/i,
  /revoke\s+all\s+on\s+public\.hiring_state_history\s+from\s+anon\s*,\s*authenticated/i,
  /candidate_workflow\s*<>\s*new\.workflow_id/i,
];
for (const pattern of requiredLifecycleGuards) {
  if (!pattern.test(lifecycleMigration)) throw new Error(`Hiring lifecycle persistence guard missing: ${pattern}`);
}

const rlsMigration = await readFile(path.join(root, '014_recruiting_core_rls_force.sql'), 'utf8');
const requiredCoreRlsTables = ['hiring_workflows', 'recruiting_candidates', 'recruiting_interviews'];
for (const table of requiredCoreRlsTables) {
  const tablePattern = new RegExp(`alter\\s+table\\s+if\\s+exists\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
  const forcePattern = new RegExp(`alter\\s+table\\s+if\\s+exists\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i');
  const revokePattern = new RegExp(`revoke\\s+all\\s+on\\s+public\\.${table}\\s+from\\s+anon\\s*,\\s*authenticated`, 'i');
  if (!tablePattern.test(rlsMigration) || !forcePattern.test(rlsMigration) || !revokePattern.test(rlsMigration)) {
    throw new Error(`Recruiting core RLS coverage incomplete for ${table}`);
  }
}

const defenseMigration = await readFile(path.join(root, '012_recruiting_rls_defense_in_depth.sql'), 'utf8');
for (const table of ['recruiting_audit_events', 'hiring_state_history']) {
  const pattern = new RegExp(`alter\\s+table\\s+if\\s+exists\\s+public\\.${table}\\s+(enable|force)\\s+row\\s+level\\s+security`, 'ig');
  const matches = [...defenseMigration.matchAll(pattern)].map(match => match[1].toLowerCase());
  if (!matches.includes('enable') || !matches.includes('force')) {
    throw new Error(`Recruiting audit RLS coverage incomplete for ${table}`);
  }
}

const tenantIntegrityMigration = await readFile(path.join(root, '015_recruiting_tenant_integrity_fks.sql'), 'utf8');
const requiredTenantIntegrityConstraints = [
  /create\s+unique\s+index\s+if\s+not\s+exists\s+hiring_workflows_tenant_id_uidx/i,
  /create\s+unique\s+index\s+if\s+not\s+exists\s+recruiting_candidates_tenant_id_uidx/i,
  /recruiting_candidates_tenant_workflow_fk[\s\S]*foreign\s+key\s*\(tenant_id\s*,\s*workflow_id\)[\s\S]*references\s+public\.hiring_workflows\s*\(tenant_id\s*,\s*id\)[\s\S]*on\s+delete\s+cascade[\s\S]*not\s+valid/i,
  /recruiting_audit_events_tenant_workflow_fk[\s\S]*foreign\s+key\s*\(tenant_id\s*,\s*workflow_id\)[\s\S]*references\s+public\.hiring_workflows\s*\(tenant_id\s*,\s*id\)[\s\S]*on\s+delete\s+cascade[\s\S]*not\s+valid/i,
  /recruiting_audit_events_tenant_candidate_fk[\s\S]*foreign\s+key\s*\(tenant_id\s*,\s*candidate_id\)[\s\S]*references\s+public\.recruiting_candidates\s*\(tenant_id\s*,\s*id\)[\s\S]*on\s+delete\s+set\s+null[\s\S]*not\s+valid/i,
  /recruiting_interviews_tenant_workflow_fk[\s\S]*foreign\s+key\s*\(tenant_id\s*,\s*workflow_id\)[\s\S]*references\s+public\.hiring_workflows\s*\(tenant_id\s*,\s*id\)[\s\S]*on\s+delete\s+cascade[\s\S]*not\s+valid/i,
  /recruiting_interviews_tenant_candidate_fk[\s\S]*foreign\s+key\s*\(tenant_id\s*,\s*candidate_id\)[\s\S]*references\s+public\.recruiting_candidates\s*\(tenant_id\s*,\s*id\)[\s\S]*on\s+delete\s+cascade[\s\S]*not\s+valid/i,
];
for (const pattern of requiredTenantIntegrityConstraints) {
  if (!pattern.test(tenantIntegrityMigration)) throw new Error(`Recruiting tenant integrity guard missing: ${pattern}`);
}

const tenantConstraintNames = [...tenantIntegrityMigration.matchAll(/add\s+constraint\s+(recruiting_[a-z_]+_fk)/gi)].map(match => match[1].toLowerCase());
if (tenantConstraintNames.length !== 5 || new Set(tenantConstraintNames).size !== 5) {
  throw new Error(`Expected five unique recruiting tenant FK constraints, found ${tenantConstraintNames.length}`);
}

const tenantIndexMigration = await readFile(path.join(root, '016_recruiting_tenant_fk_indexes.sql'), 'utf8');
const requiredTenantIndexes = [
  'recruiting_candidates_tenant_workflow_fk_idx',
  'recruiting_audit_events_tenant_workflow_fk_idx',
  'recruiting_audit_events_tenant_candidate_fk_idx',
  'recruiting_interviews_tenant_workflow_fk_idx',
  'recruiting_interviews_tenant_candidate_fk_idx',
];
for (const indexName of requiredTenantIndexes) {
  const pattern = new RegExp(`create\\s+index\\s+if\\s+not\\s+exists\\s+${indexName}\\s+on\\s+public\\.(recruiting_candidates|recruiting_audit_events|recruiting_interviews)`, 'i');
  if (!pattern.test(tenantIndexMigration)) throw new Error(`Recruiting tenant FK index missing: ${indexName}`);
}
if ((tenantIndexMigration.match(/create\s+index\s+if\s+not\s+exists/gi) || []).length !== requiredTenantIndexes.length) {
  throw new Error(`Expected ${requiredTenantIndexes.length} recruiting tenant FK indexes`);
}

const preflightMigration = await readFile(path.join(root, '017_recruiting_tenant_integrity_preflight.sql'), 'utf8');
const requiredPreflightGuards = [
  /create\s+or\s+replace\s+function\s+public\.recruiting_tenant_integrity_violation_counts/i,
  /returns\s+table\s*\(/i,
  /security\s+definer/i,
  /set\s+search_path\s*=\s*public/i,
  /candidates_missing_workflow/i,
  /audit_events_missing_workflow/i,
  /audit_events_missing_candidate/i,
  /interviews_missing_workflow/i,
  /interviews_missing_candidate/i,
  /revoke\s+all\s+on\s+function\s+public\.recruiting_tenant_integrity_violation_counts\(\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
];
for (const pattern of requiredPreflightGuards) {
  if (!pattern.test(preflightMigration)) throw new Error(`Recruiting tenant integrity preflight guard missing: ${pattern}`);
}

console.log(`Supabase migration verification passed: ${files.join(', ')}`);
console.log('Hiring lifecycle persistence tenant guard verification passed');
console.log('Recruiting core and audit RLS verification passed');
console.log('Recruiting tenant integrity constraint verification passed');
console.log('Recruiting tenant FK index verification passed');
console.log('Recruiting tenant integrity preflight verification passed');
