import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = await mkdtemp(path.join(os.tmpdir(), 'smartscout-lifecycle-'));

const { saveCandidates, updateCandidateStatus } = await import('../services/recruiting/candidateStore.ts');
const { listAudit } = await import('../services/recruiting/controlPlane.ts');

const lifecycleStatuses = [
  'discovered',
  'screened',
  'shortlisted',
  'interview',
  'selected',
  'rejected',
  'offered',
  'accepted',
  'onboarded'
];

try {
  const saved = await saveCandidates('tenant-lifecycle-regression', 'job-lifecycle-regression', [
    { name: 'Default candidate' },
    { name: 'Explicit candidate', status: ' screened ' }
  ]);
  assert.equal(saved.length, 2);
  assert.equal(saved[0].candidate.status, 'discovered');
  assert.equal(saved[1].candidate.status, 'screened');

  const allStates = await saveCandidates(
    'tenant-lifecycle-regression',
    'job-lifecycle-state-regression',
    lifecycleStatuses.map(status => ({ name: `${status} candidate`, status }))
  );
  assert.deepEqual(allStates.map(candidate => candidate.candidate.status), lifecycleStatuses);

  await assert.rejects(
    () => saveCandidates('tenant-lifecycle-regression', 'job-lifecycle-regression', [{ name: 'Candidate', status: 'not-a-lifecycle-state' }]),
    /unsupported candidate lifecycle status/
  );

  await assert.rejects(
    () => updateCandidateStatus('tenant-lifecycle-regression', 'candidate_missing', 'not-a-lifecycle-state'),
    /unsupported candidate lifecycle status/
  );

  const updated = await updateCandidateStatus('tenant-lifecycle-regression', saved[1].id, 'interview');
  assert.equal(updated?.candidate.status, 'interview');

  const unchanged = await updateCandidateStatus('tenant-lifecycle-regression', saved[1].id, 'interview');
  assert.equal(unchanged?.candidate.status, 'interview');

  const auditEvents = await listAudit('tenant-lifecycle-regression', 'job-lifecycle-regression', saved[1].id);
  assert.deepEqual(auditEvents.map(event => event.action), [
    'candidate_status_updated'
  ]);
  assert.deepEqual(auditEvents[0]?.metadata, {
    previousStatus: 'screened',
    nextStatus: 'interview'
  });
} finally {
  await rm(process.env.SMARTSCOUT_CONTROL_PLANE_DIR, { recursive: true, force: true });
}

console.log('candidate lifecycle status regression passed');
