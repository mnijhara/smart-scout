import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.resolve('supabase/migrations/015_recruiting_core_rls_defense_in_depth.sql');
const source = fs.readFileSync(migrationPath, 'utf8');

for (const table of ['hiring_workflows', 'recruiting_candidates']) {
  const tablePattern = new RegExp(`alter\\s+table\\s+if\\s+exists\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
  const forcePattern = new RegExp(`alter\\s+table\\s+if\\s+exists\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i');
  if (!tablePattern.test(source)) throw new Error(`RLS regression: ${table} is not explicitly enabled`);
  if (!forcePattern.test(source)) throw new Error(`RLS regression: ${table} is not forced`);
}

if (/create\s+policy/i.test(source)) {
  throw new Error('RLS regression: core recruiting migration must not add an unverified permissive policy');
}

console.log('recruiting-core-rls-regression: ok');
