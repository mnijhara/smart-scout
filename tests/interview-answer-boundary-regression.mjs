import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(os.tmpdir(), 'smartscout-interview-answer-'));
process.env.SMARTSCOUT_INTERVIEW_STORE = path.join(root, 'interviews.json');

try {
  const { createInterview, recordInterviewAnswer } = await import('../services/recruiting/interviewStore.ts');
  const interview = await createInterview('tenant-a', 'job-a', 'candidate-a', { questions: [] });

  await assert.rejects(
    () => recordInterviewAnswer('tenant-a', interview.id, 'q1', 'x'.repeat(10_001)),
    /exceeds 10000 characters/
  );
  await assert.rejects(
    () => recordInterviewAnswer('tenant-a', interview.id, 'q1', /** @type {any} */ (null)),
    /answer must be a string/
  );

  const saved = await recordInterviewAnswer('tenant-a', interview.id, 'q1', 'valid answer');
  assert.equal(saved?.answers.at(-1)?.answer, 'valid answer');
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log('Interview answer boundary regression passed.');
