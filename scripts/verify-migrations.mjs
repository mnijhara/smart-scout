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
console.log(`Supabase migration verification passed: ${files.join(', ')}`);
