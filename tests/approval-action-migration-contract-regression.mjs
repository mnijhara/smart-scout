import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/004_align_approval_action_contract.sql', 'utf8');
const controlPlane = fs.readFileSync('services/recruiting/controlPlane.ts', 'utf8');

assert.match(migration, /drop constraint if exists recruiting_approvals_action_check/i);
assert.match(
  migration,
  /check \(action in \('jd_approval','reject','decision','compensation','offer','employee_create'\)\)/i,
  'approval persistence migration must allow every action supported by the control-plane type',
);
assert.match(
  controlPlane,
  /action:'jd_approval'\|'reject'\|'decision'\|'compensation'\|'offer'\|'employee_create'/,
  'control-plane approval action type must retain the JD approval action',
);

console.log('Approval action migration contract regression passed.');
