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

console.log(`migration-readiness-regression: ok (${entries.length} ordered migrations)`);
