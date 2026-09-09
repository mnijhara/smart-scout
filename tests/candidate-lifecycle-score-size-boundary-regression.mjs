import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = await mkdtemp(path.join(os.tmpdir(), 'smartscout-lifecycle-score-size-'));

const { saveCandidates, updateCandidateScore } = await import('../services/recruiting/candidateStore.ts');

try {
  const saved = await saveCandidates('tenant-score-size', 'job-score-size', [{ name: 'Score size candidate' }]);
  const candidate = saved[0];
  const oversized = { evidence: 'x'.repeat(9000) };

  await assert.rejects(
    () => updateCandidateScore('tenant-score-size', candidate.id, oversized),
    /score is too large/
  );

  const unchanged = await updateCandidateScore('tenant-score-size', candidate.id, { total: 1 });
  assert.deepEqual(unchanged?.score, { total: 1 });
} finally {
  await rm(process.env.SMARTSCOUT_CONTROL_PLANE_DIR, { recursive: true, force: true });
}

console.log('candidate lifecycle score size boundary regression passed');
