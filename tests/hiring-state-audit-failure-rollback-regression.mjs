import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-audit-failure-'));
const stateFile = path.join(dir, 'states.json');
const controlPlaneDir = path.join(dir, 'control-plane');
process.env.SMARTSCOUT_HIRING_STATE_STORE = stateFile;
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = controlPlaneDir;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { saveHiringState, listHiringStates } = await import('../services/recruiting/hiringStateStore.ts');

// Establish a valid pre-existing state first. The later audit failure must only
// roll back the state belonging to the failed write, not unrelated lifecycle data.
await saveHiringState('tenant_a', 'job_1', 'screening', { recommendation: 'advance' }, 'candidate_1');
assert.equal((await listHiringStates('tenant_a', 'job_1')).length, 1);

// Make the audit destination itself a directory. Audit persistence must fail,
// while the hiring-state file remains independently writable for rollback.
fs.mkdirSync(path.join(controlPlaneDir, 'audit.json'));

await assert.rejects(
  () => saveHiringState('tenant_a', 'job_1', 'decision', { recommendation: 'hire' }, 'candidate_1'),
  /EISDIR|audit/i,
  'a failed audit write must reject the hiring-state save'
);

const states = await listHiringStates('tenant_a', 'job_1');
assert.equal(states.length, 1, 'rollback must preserve unrelated hiring state records');
assert.equal(states[0].type, 'screening');
assert.equal(states[0].payload.recommendation, 'advance');

const persistedStateFile = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
assert.equal(persistedStateFile.length, 1, 'rollback must remove only the failed state from durable local storage');
assert.equal(persistedStateFile[0].type, 'screening');

console.log('Hiring-state audit failure rollback regression passed.');
