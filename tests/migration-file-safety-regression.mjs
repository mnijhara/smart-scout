import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('supabase/migrations');
const protectedTables = ['hiring_workflows', 'recruiting_candidates', 'recruiting_audit_events', 'recruiting_interviews'];
const files = fs.readdirSync(root).filter(name => name.endsWith('.sql')).sort();
assert.ok(files.length > 0, 'expected Supabase migrations to exist');

for (const file of files) {
  const sql = fs.readFileSync(path.join(root, file), 'utf8');
  for (const table of protectedTables) {
    const dropPattern = new RegExp(`\\bDROP\\s+TABLE(?:\\s+IF\\s+EXISTS)?\\s+(?:IF\\s+EXISTS\\s+)?(?:public\\.)?${table}\\b`, 'i');
    assert.doesNotMatch(sql, dropPattern, `${file} must not drop protected table ${table}`);
  }
}

console.log(`Migration protected-table safety regression passed across ${files.length} SQL files`);
