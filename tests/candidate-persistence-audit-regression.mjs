import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartscout-candidate-audit-'));
process.env.SMARTSCOUT_CANDIDATE_STORE = path.join(dir, 'candidates.json');
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = path.join(dir, 'control-plane');
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { saveCandidates, updateCandidateScore } = await import('../services/recruiting/candidateStore.ts');

const tenantId = 'tenant-audit-regression';
const jobId = 'job_audit-regression';
const [candidate] = await saveCandidates(tenantId, jobId, [{ name: 'Candidate', status: 'discovered' }]);
assert.ok(candidate?.id);

await updateCandidateScore(tenantId, candidate.id, { score: 88 });

const auditPath = path.join(dir, 'control-plane', 'audit.json');
const events = JSON.parse(await fs.readFile(auditPath, 'utf8'));
const lifecycle = events.filter(event => event.tenantId === tenantId && event.jobId === jobId && event.candidateId === candidate.id);
assert.deepEqual(lifecycle.map(event => event.action).sort(), ['candidate_score_updated', 'candidates_persisted']);
assert.equal(lifecycle.filter(event => event.action === 'candidates_persisted')[0].metadata.count, 1);
assert.deepEqual(lifecycle.filter(event => event.action === 'candidate_score_updated')[0].metadata.score, { score: 88 });

console.log('candidate persistence audit regression: PASS');
