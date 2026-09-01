import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartscout-hiring-state-'));
process.env.SMARTSCOUT_CANDIDATE_STORE = path.join(dir, 'candidates.json');
process.env.SMARTSCOUT_HIRING_STATE_STORE = path.join(dir, 'hiring-state.json');
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = path.join(dir, 'control-plane');
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.NODE_ENV = 'test';

const { saveCandidates } = await import('../services/recruiting/candidateStore.ts');
const { saveHiringState, listHiringStates } = await import('../services/recruiting/hiringStateStore.ts');

const tenantId = 'tenant-hiring-boundary';
const otherTenantId = 'tenant-hiring-boundary-other';
const jobId = 'job_hiring-boundary';
const otherJobId = 'job_hiring-boundary-other';
const [candidate] = await saveCandidates(tenantId, jobId, [{ name: 'Lifecycle Candidate', status: 'screening' }]);
assert.ok(candidate?.id);

const saved = await saveHiringState(tenantId, jobId, 'decision', { decision: 'advance' }, candidate.id);
assert.equal(saved.candidateId, candidate.id);
assert.deepEqual((await listHiringStates(tenantId, jobId, 'decision', candidate.id)).map(state => state.id), [saved.id]);

await assert.rejects(
  () => saveHiringState(tenantId, otherJobId, 'decision', { decision: 'advance' }, candidate.id),
  /Candidate does not belong to this tenant and job/
);
await assert.rejects(
  () => listHiringStates(tenantId, otherJobId, 'decision', candidate.id),
  /Candidate does not belong to this tenant and job/
);
await assert.rejects(
  () => saveHiringState(otherTenantId, jobId, 'decision', { decision: 'advance' }, candidate.id),
  /Candidate does not belong to this tenant and job/
);
await assert.rejects(
  () => listHiringStates(otherTenantId, jobId, 'decision', candidate.id),
  /Candidate does not belong to this tenant and job/
);

const auditPath = path.join(dir, 'control-plane', 'audit.json');
const events = JSON.parse(await fs.readFile(auditPath, 'utf8'));
const lifecycle = events.filter(event => event.tenantId === tenantId && event.jobId === jobId && event.candidateId === candidate.id);
assert.equal(lifecycle.filter(event => event.action === 'hiring_state_decision_saved').length, 1);

console.log('hiring state candidate boundary regression: PASS');
