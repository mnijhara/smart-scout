import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.resolve('supabase/migrations');
const entries = fs.readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
  .map((entry) => entry.name)
  .sort();

if (!entries.length) throw new Error('Migration readiness regression: no SQL migrations found');

const versions = entries.map((name) => {
  const match = /^(\d+)_/.exec(name);
  if (!match) throw new Error(`Migration readiness regression: invalid migration filename ${name}`);
  return Number(match[1]);
});

for (let index = 1; index < versions.length; index += 1) {
  if (versions[index] !== versions[index - 1] + 1) {
    throw new Error(`Migration readiness regression: migration sequence gap before ${entries[index]}`);
  }
}

for (const name of entries) {
  const source = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
  if (/\bDROP\s+TABLE\b/i.test(source) && !/IF\s+EXISTS/i.test(source)) {
    throw new Error(`Migration readiness regression: destructive DROP TABLE without IF EXISTS in ${name}`);
  }
}

const tenantIntegrity = fs.readFileSync(
  path.join(migrationsDir, '015_recruiting_tenant_integrity_fks.sql'),
  'utf8',
);
const requiredTenantConstraints = [
  'recruiting_candidates_tenant_workflow_fk',
  'recruiting_audit_events_tenant_workflow_fk',
  'recruiting_audit_events_tenant_candidate_fk',
  'recruiting_interviews_tenant_workflow_fk',
  'recruiting_interviews_tenant_candidate_fk',
];
for (const constraint of requiredTenantConstraints) {
  if (!new RegExp(`add\\s+constraint\\s+${constraint}\\b`, 'i').test(tenantIntegrity)) {
    throw new Error(`Migration readiness regression: missing tenant FK ${constraint}`);
  }
}
if ((tenantIntegrity.match(/NOT\s+VALID/gi) || []).length !== requiredTenantConstraints.length) {
  throw new Error('Migration readiness regression: tenant FKs must remain NOT VALID until legacy data is preflighted');
}

const preflight = fs.readFileSync(
  path.join(migrationsDir, '017_recruiting_tenant_integrity_preflight.sql'),
  'utf8',
);
if (!/create\s+or\s+replace\s+function\s+public\.recruiting_tenant_integrity_violation_counts/i.test(preflight)) {
  throw new Error('Migration readiness regression: tenant integrity preflight function missing');
}
if (!/security\s+definer/i.test(preflight) || !/set\s+search_path\s*=\s*public/i.test(preflight)) {
  throw new Error('Migration readiness regression: preflight function security hardening missing');
}
if (!/revoke\s+all\s+on\s+function\s+public\.recruiting_tenant_integrity_violation_counts\(\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i.test(preflight)) {
  throw new Error('Migration readiness regression: preflight function must not be callable by client roles');
}
if (/\b(insert|update|delete|alter|drop|truncate)\b/i.test(preflight)) {
  throw new Error('Migration readiness regression: tenant integrity preflight must remain read-only');
}

console.log(`migration-readiness-regression: ok (${entries.length} ordered migrations)`);
