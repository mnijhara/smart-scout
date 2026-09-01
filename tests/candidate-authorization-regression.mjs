import assert from 'node:assert/strict';
import { assertCandidateBelongsToJob } from '../dist/services/recruiting/candidateAuthorization.js';

const candidate = {
  id: 'candidate_1',
  tenantId: 'tenant_a',
  jobId: 'job_1',
  candidate: { id: 'candidate_1', status: 'discovered' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

assert.equal(assertCandidateBelongsToJob(candidate, 'tenant_a', 'job_1', 'candidate_1'), candidate);
assert.throws(() => assertCandidateBelongsToJob(candidate, 'tenant_b', 'job_1', 'candidate_1'), /does not belong/);
assert.throws(() => assertCandidateBelongsToJob(candidate, 'tenant_a', 'job_2', 'candidate_1'), /does not belong/);
assert.throws(() => assertCandidateBelongsToJob(candidate, 'tenant_a', 'job_1', 'candidate_2'), /does not belong/);
assert.throws(() => assertCandidateBelongsToJob(null, 'tenant_a', 'job_1', 'candidate_1'), /does not belong/);

console.log('candidate authorization regression checks passed');
