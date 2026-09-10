import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.resolve('supabase/migrations/030_candidate_lifecycle_status_constraint.sql');
const schemaPath = path.resolve('supabase/migrations/002_recruiting_os_core.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

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
const statusCheck = sql.match(/check\s*\(\s*status\s+in\s*\((.*?)\)\s*\)\s+not\s+valid/is)?.[1] ?? '';
assert.ok(statusCheck, 'migration must define a staged status CHECK constraint');

const persistedStatuses = [...statusCheck.matchAll(/['\"]([^'\"]+)['\"]/g)].map(match => match[1]);
assert.deepEqual(
  persistedStatuses,
  expectedStatuses,
  'migration must allow exactly the application lifecycle states, in canonical order',
);
assert.equal(
  new Set(persistedStatuses).size,
  expectedStatuses.length,
  'migration must not contain duplicate lifecycle states',
);

assert.match(sql, /\)\s+not\s+valid\s*;/i, 'migration must stage validation explicitly');
assert.match(sql, /validate\s+constraint\s+recruiting_candidates_status_check\s*;/i, 'migration must validate the staged constraint');

const addIndex = sql.indexOf('add constraint recruiting_candidates_status_check');
const validateIndex = sql.indexOf('validate constraint recruiting_candidates_status_check');
assert.ok(addIndex >= 0 && validateIndex > addIndex, 'constraint validation must occur after the constraint is added');

const candidatesTable = schemaSql.match(/create table if not exists public\.recruiting_candidates\s*\((.*?)\n\);/is)?.[1] ?? '';
assert.match(candidatesTable, /status\s+text\s+not\s+null\s+default\s+'discovered'/i, 'base schema must keep lifecycle status non-null with a safe default');

console.log('Candidate lifecycle migration constraint regression passed');
