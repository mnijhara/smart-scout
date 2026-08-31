import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('supabase/migrations');
const files = (await readdir(root)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
if (!files.length) throw new Error('No Supabase migrations found');
const versions = files.map(name => Number(name.split('_', 1)[0]));
const duplicates = versions.filter((v, i) => versions.indexOf(v) !== i);
if (duplicates.length) throw new Error(`Duplicate migration versions: ${[...new Set(duplicates)].join(', ')}`);
for (let i = 1; i < versions.length; i++) if (versions[i] !== versions[i - 1] + 1) throw new Error(`Migration sequence gap between ${versions[i - 1]} and ${versions[i]}`);
for (const file of files) {
  const sql = await readFile(path.join(root, file), 'utf8');
  if (!sql.trim()) throw new Error(`Empty migration: ${file}`);
  if (/DROP\s+TABLE\s+public\.(hiring_workflows|recruiting_candidates|recruiting_audit_events|recruiting_interviews)/i.test(sql)) throw new Error(`Destructive protected-table drop found in ${file}`);
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

console.log(`Supabase migration verification passed: ${files.join(', ')}`);
console.log('Hiring lifecycle persistence tenant guard verification passed');
console.log('Recruiting core and audit RLS verification passed');
