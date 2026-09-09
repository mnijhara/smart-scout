import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = await mkdtemp(path.join(os.tmpdir(), 'smartscout-lifecycle-score-noop-'));

const { saveCandidates, updateCandidateScore } = await import('../services/recruiting/candidateStore.ts');
const { listAuditEvents } = await import('../services/recruiting/controlPlane.js');

try {
  const saved = await saveCandidates('tenant-score-noop', 'job-score-noop', [{ name: 'Score candidate', score: { total: 82 } }]);
  const candidate = saved[0];

  const before = await listAuditEvents('tenant-score-noop', 'job-score-noop');
  const updated = await updateCandidateScore('tenant-score-noop', candidate.id, { total: 82 });
  assert.deepEqual(updated?.score, { total: 82 });

  const after = await listAuditEvents('tenant-score-noop', 'job-score-noop');
  assert.equal(after.length, before.length, 'a no-op score update must not create an audit event');

  const changed = await updateCandidateScore('tenant-score-noop', candidate.id, { total: 91 });
  assert.deepEqual(changed?.score, { total: 91 });
  const finalEvents = await listAuditEvents('tenant-score-noop', 'job-score-noop');
  assert.equal(finalEvents.length, before.length + 1);
  assert.equal(finalEvents.at(-1)?.action, 'candidate_score_updated');
} finally {
  await rm(process.env.SMARTSCOUT_CONTROL_PLANE_DIR, { recursive: true, force: true });
}

console.log('candidate lifecycle score no-op regression passed');
