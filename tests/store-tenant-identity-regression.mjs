import { createJob, getJob, listJobs } from '../services/recruiting/jobStore.ts';
import { listCandidates, saveCandidates, updateCandidateScore } from '../services/recruiting/candidateStore.ts';

async function expectRequired(label, fn) {
  try {
    await fn();
    throw new Error(`${label} unexpectedly accepted an empty tenantId`);
  } catch (error) {
    if (!String(error?.message || '').includes('tenantId is required')) throw error;
  }
}

await expectRequired('createJob', () => createJob('   ', 'prompt', {}));
await expectRequired('getJob', () => getJob('', 'job_missing'));
await expectRequired('listJobs', () => listJobs(''));
await expectRequired('saveCandidates', () => saveCandidates('', 'job_missing', []));
await expectRequired('listCandidates', () => listCandidates('   ', 'job_missing'));
await expectRequired('updateCandidateScore', () => updateCandidateScore('', 'candidate_missing', { score: 1 }));

console.log('STORE_TENANT_IDENTITY_REGRESSION_OK');
