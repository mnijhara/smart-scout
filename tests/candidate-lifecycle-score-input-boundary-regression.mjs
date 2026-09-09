import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = await mkdtemp(path.join(os.tmpdir(), 'smartscout-lifecycle-score-input-'));

const { saveCandidates, updateCandidateScore } = await import('../services/recruiting/candidateStore.ts');

try {
  const saved = await saveCandidates('tenant-score-input', 'job-score-input', [{ name: 'Score boundary candidate' }]);
  const candidate = saved[0];

  await assert.rejects(
    () => updateCandidateScore('tenant-score-input', candidate.id, undefined),
    /score is invalid/
  );

  const unchanged = await updateCandidateScore('tenant-score-input', candidate.id, { total: 0 });
  assert.deepEqual(unchanged?.score, { total: 0 });
} finally {
  await rm(process.env.SMARTSCOUT_CONTROL_PLANE_DIR, { recursive: true, force: true });
}

console.log('candidate lifecycle score input boundary regression passed');
