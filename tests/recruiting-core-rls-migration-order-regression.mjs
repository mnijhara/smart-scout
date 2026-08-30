import fs from 'node:fs';

const migrations = fs.readdirSync(new URL('../supabase/migrations/', import.meta.url)).sort();
const rlsMigration = migrations.find(name => name === '015_recruiting_core_rls_defense_in_depth.sql');
if (!rlsMigration) throw new Error('Recruiting core RLS migration 015 is missing');

const migrationIndex = migrations.indexOf(rlsMigration);
const auditMigration = migrations.findIndex(name => name.startsWith('001_') && name.includes('audit'));
if (auditMigration >= 0 && migrationIndex <= auditMigration) {
  throw new Error('Recruiting core RLS hardening must run after the recruiting audit schema exists');
}

const source = fs.readFileSync(new URL(`../supabase/migrations/${rlsMigration}`, import.meta.url), 'utf8');
for (const table of ['hiring_workflows', 'recruiting_candidates']) {
  if (!new RegExp(`ALTER TABLE\\s+${table}\\s+ENABLE ROW LEVEL SECURITY`, 'i').test(source)) {
    throw new Error(`${table} must explicitly enable RLS`);
  }
  if (!new RegExp(`ALTER TABLE\\s+${table}\\s+FORCE ROW LEVEL SECURITY`, 'i').test(source)) {
    throw new Error(`${table} must explicitly force RLS`);
  }
}

if (/CREATE POLICY/i.test(source)) {
  throw new Error('Core recruiting RLS migration must not add permissive policies before authenticated tenant claims are wired');
}

console.log('recruiting core RLS migration order regression: passed');
