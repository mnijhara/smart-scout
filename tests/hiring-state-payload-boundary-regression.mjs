import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-hiring-payload-'));
process.env.SMARTSCOUT_HIRING_STATE_STORE = path.join(dir, 'states.json');
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = path.join(dir, 'control-plane');
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { saveHiringState, listHiringStates } = await import('../services/recruiting/hiringStateStore.ts');

await assert.rejects(
  () => saveHiringState('tenant_a', 'job_1', 'decision', { evidence: 'x'.repeat(64 * 1024) }),
  /payload exceeds 65536 bytes/
);
await assert.rejects(
  () => saveHiringState('tenant_a', 'job_1', 'decision', { value: BigInt(1) }),
  /payload must be JSON serializable/
);
await assert.rejects(
  () => saveHiringState('tenant_a', 'job_1', 'x'.repeat(129), {}),
  /type exceeds 128 characters/
);

const saved = await saveHiringState('tenant_a', 'job_1', 'decision', { recommendation: 'hire' }, 'candidate_1');
assert.equal(saved.type, 'decision');
assert.deepEqual(saved.payload, { recommendation: 'hire' });

const states = await listHiringStates('tenant_a', 'job_1', 'decision');
assert.equal(states.length, 1);
assert.equal(states[0].candidateId, 'candidate_1');

console.log('Hiring-state payload and type boundary regression checks passed.');
