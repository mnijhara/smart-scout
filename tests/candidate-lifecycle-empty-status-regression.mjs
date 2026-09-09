import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = await mkdtemp(path.join(os.tmpdir(), 'smartscout-lifecycle-empty-status-'));

const { saveCandidates, updateCandidateStatus } = await import('../services/recruiting/candidateStore.ts');

try {
  await assert.rejects(
    () => saveCandidates('tenant-lifecycle-input', 'job-lifecycle-input', [{ name: 'Empty status', status: '' }]),
    /unsupported candidate lifecycle status/
  );

  await assert.rejects(
    () => saveCandidates('tenant-lifecycle-input', 'job-lifecycle-input', [{ name: 'Whitespace status', status: '   ' }]),
    /unsupported candidate lifecycle status/
  );

  const saved = await saveCandidates('tenant-lifecycle-input', 'job-lifecycle-input', [{ name: 'Valid candidate' }]);
  assert.equal(saved[0].candidate.status, 'discovered');

  await assert.rejects(
    () => updateCandidateStatus('tenant-lifecycle-input', saved[0].id, '   '),
    /unsupported candidate lifecycle status/
  );

  const persisted = await saveCandidates('tenant-lifecycle-input', 'job-lifecycle-input', [{ name: 'Second valid candidate', status: ' screened ' }]);
  assert.equal(persisted[0].candidate.status, 'screened');
} finally {
  await rm(process.env.SMARTSCOUT_CONTROL_PLANE_DIR, { recursive: true, force: true });
}

console.log('candidate lifecycle empty-status regression passed');
