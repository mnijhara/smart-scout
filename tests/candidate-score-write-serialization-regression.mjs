import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartscout-candidate-store-'));
const file = path.join(dir, 'candidates.json');
process.env.SMARTSCOUT_CANDIDATE_STORE = file;

const { saveCandidates, updateCandidateScore, listCandidates } = await import('../services/recruiting/candidateStore.ts');

const tenantId = 'tenant-regression';
const jobId = 'job_regression';
const [candidate] = await saveCandidates(tenantId, jobId, [{ name: 'Candidate', status: 'discovered' }]);

const results = await Promise.all([
  updateCandidateScore(tenantId, candidate.id, { score: 71 }),
  updateCandidateScore(tenantId, candidate.id, { score: 92 }),
]);

assert.equal(results[0]?.id, candidate.id);
assert.equal(results[1]?.id, candidate.id);
const listed = await listCandidates(tenantId, jobId);
assert.equal(listed.length, 1);
assert.deepEqual(listed[0].score, { score: 92 });

console.log('candidate score serialization regression: PASS');
