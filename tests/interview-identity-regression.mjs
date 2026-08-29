import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(os.tmpdir(), 'smartscout-interview-identity-'));
process.env.SMARTSCOUT_INTERVIEW_STORE = path.join(root, 'interviews.json');

try {
  const { createInterview, getInterview, listInterviews, recordInterviewAnswer, completeInterview } = await import('../services/recruiting/interviewStore.ts');

  await assert.rejects(() => createInterview('', 'job-a', 'candidate-a', {}), /tenantId is required/);
  await assert.rejects(() => createInterview('tenant-a', '   ', 'candidate-a', {}), /jobId is required/);
  await assert.rejects(() => createInterview('tenant-a', 'job-a', '   ', {}), /candidateId is required/);
  await assert.rejects(() => getInterview('   ', 'interview-a'), /tenantId is required/);
  await assert.rejects(() => getInterview('tenant-a', '   '), /interviewId is required/);
  await assert.rejects(() => listInterviews('tenant-a', '   '), /jobId is required/);
  await assert.rejects(() => recordInterviewAnswer('tenant-a', 'interview-a', '   ', 'answer'), /questionId is required/);
  await assert.rejects(() => completeInterview('tenant-a', '   ', {}), /interviewId is required/);

  const interview = await createInterview('tenant-a', 'job-a', 'candidate-a', { questions: [] });
  assert.equal((await getInterview('tenant-a', interview.id))?.candidateId, 'candidate-a');
  assert.equal((await listInterviews('tenant-a', 'job-a')).length, 1);
  assert.equal((await recordInterviewAnswer('tenant-a', interview.id, 'q1', 'yes'))?.status, 'in_progress');
  assert.equal((await completeInterview('tenant-a', interview.id, { score: 1 }))?.status, 'completed');
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log('Interview identity regression passed.');
