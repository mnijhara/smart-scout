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

// Make the audit destination itself a directory. Audit persistence must fail,
// while the hiring-state file remains independently writable for rollback.
fs.mkdirSync(controlPlaneDir, { recursive: true });
fs.mkdirSync(path.join(controlPlaneDir, 'audit.json'));

const { saveHiringState, listHiringStates } = await import('../services/recruiting/hiringStateStore.ts');

await assert.rejects(
  () => saveHiringState('tenant_a', 'job_1', 'decision', { recommendation: 'hire' }, 'candidate_1'),
  /EISDIR|audit/i,
  'a failed audit write must reject the hiring-state save'
);

assert.equal(
  (await listHiringStates('tenant_a', 'job_1')).length,
  0,
  'a hiring state must be rolled back when its audit event cannot be persisted'
);

const persistedStateFile = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
assert.equal(persistedStateFile.length, 0, 'rollback must remove the state from durable local storage');

console.log('Hiring-state audit failure rollback regression passed.');
