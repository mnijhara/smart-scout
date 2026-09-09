import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.resolve('supabase/migrations/004_candidate_lifecycle_status_constraint.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

const expectedStatuses = [
  'discovered',
  'screened',
  'shortlisted',
  'interview',
  'selected',
  'rejected',
  'offered',
  'accepted',
  'onboarded',
];

assert.match(sql, /alter\s+table\s+public\.recruiting_candidates\s+\n?\s*add\s+constraint\s+recruiting_candidates_status_check/i);
assert.match(sql, /check\s*\(\s*status\s+in\s*\(/i);
for (const status of expectedStatuses) {
  assert.match(sql, new RegExp(`['"]${status}['"]`), `migration must allow lifecycle status ${status}`);
}
assert.match(sql, /\)\s+not\s+valid\s*;/i, 'migration must stage validation explicitly');
assert.match(sql, /validate\s+constraint\s+recruiting_candidates_status_check\s*;/i, 'migration must validate the staged constraint');

const addIndex = sql.indexOf('add constraint recruiting_candidates_status_check');
const validateIndex = sql.indexOf('validate constraint recruiting_candidates_status_check');
assert.ok(addIndex >= 0 && validateIndex > addIndex, 'constraint validation must occur after the constraint is added');

console.log('Candidate lifecycle migration constraint regression passed');
