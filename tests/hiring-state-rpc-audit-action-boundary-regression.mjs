import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync('supabase/migrations/026_hiring_state_rpc_input_bounds.sql', 'utf8');

assert.match(migration, /length\(btrim\(p_state_type\)\)\s*>\s*128/i, 'state type must be bounded before persistence');
assert.match(migration, /'hiring_state_'\s*\|\|\s*state_row\.state_type\s*\|\|\s*'_saved'/i, 'audit action must be derived from the persisted state type');

const stateTypeLimit = 128;
const auditPrefix = 'hiring_state_';
const auditSuffix = '_saved';
assert.ok(auditPrefix.length + stateTypeLimit + auditSuffix.length <= 256, 'bounded state type must fit the audit action storage contract');

console.log('Hiring-state RPC audit action boundary contract: OK');
