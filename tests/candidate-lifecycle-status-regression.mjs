import assert from 'node:assert/strict';

process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';

const { saveCandidates, updateCandidateStatus } = await import('../services/recruiting/candidateStore.ts');

const saved = await saveCandidates('tenant-lifecycle-regression', 'job-lifecycle-regression', [
  { name: 'Default candidate' },
  { name: 'Explicit candidate', status: 'screened' }
]);
assert.equal(saved.length, 2);
assert.equal(saved[0].candidate.status, undefined);
assert.equal(saved[1].candidate.status, 'screened');

await assert.rejects(
  () => saveCandidates('tenant-lifecycle-regression', 'job-lifecycle-regression', [{ name: 'Candidate', status: 'not-a-lifecycle-state' }]),
  /unsupported candidate lifecycle status/
);

await assert.rejects(
  () => updateCandidateStatus('tenant-lifecycle-regression', 'candidate_missing', 'not-a-lifecycle-state'),
  /unsupported candidate lifecycle status/
);

console.log('candidate lifecycle status regression passed');
