import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type SavedInterview = {
  id: string;
  tenantId: string;
  jobId: string;
  candidateId: string;
  plan: any;
  answers: Array<{ questionId: string; answer: string; capturedAt: string }>;
  evidence?: any;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
};

const filePath = process.env.SMARTSCOUT_INTERVIEW_STORE || path.join(process.cwd(), '.smartscout-interviews.json');
const MAX_ANSWER_LENGTH = 10_000;
let writeQueue = Promise.resolve();

function requireInterviewIdentity(tenantId: string, jobId?: string, candidateId?: string) {
  if (!tenantId?.trim()) throw new Error('Interview tenantId is required');
  if (jobId !== undefined && !jobId.trim()) throw new Error('Interview jobId is required when provided');
  if (candidateId !== undefined && !candidateId.trim()) throw new Error('Interview candidateId is required when provided');
}

async function readAll(): Promise<SavedInterview[]> {
  try { return JSON.parse(await fs.readFile(filePath, 'utf8')); } catch { return []; }
}

async function writeAll(items: SavedInterview[]) {
  await fs.writeFile(filePath, JSON.stringify(items.slice(0, 5000), null, 2), 'utf8');
}

export async function createInterview(tenantId: string, jobId: string, candidateId: string, plan: any): Promise<SavedInterview> {
  requireInterviewIdentity(tenantId, jobId, candidateId);
  const now = new Date().toISOString();
  const interview: SavedInterview = {
    id: `interview_${crypto.randomUUID()}`,
    tenantId,
    jobId,
    candidateId,
    plan,
    answers: [],
    status: 'planned',
    createdAt: now,
    updatedAt: now,
  };
  writeQueue = writeQueue.then(async () => {
    const all = await readAll();
    await writeAll([interview, ...all.filter(x => !(x.tenantId === tenantId && x.jobId === jobId && x.candidateId === candidateId))]);
  });
  await writeQueue;
  return interview;
}

export async function getInterview(tenantId: string, interviewId: string): Promise<SavedInterview | null> {
  requireInterviewIdentity(tenantId);
  if (!interviewId?.trim()) throw new Error('Interview interviewId is required');
  return (await readAll()).find(x => x.tenantId === tenantId && x.id === interviewId) || null;
}

export async function listInterviews(tenantId: string, jobId: string): Promise<SavedInterview[]> {
  requireInterviewIdentity(tenantId, jobId);
  return (await readAll()).filter(x => x.tenantId === tenantId && x.jobId === jobId);
}

export async function recordInterviewAnswer(tenantId: string, interviewId: string, questionId: string, answer: string): Promise<SavedInterview | null> {
  requireInterviewIdentity(tenantId);
  if (!interviewId?.trim()) throw new Error('Interview interviewId is required');
  if (!questionId?.trim()) throw new Error('Interview questionId is required');
  if (typeof answer !== 'string') throw new Error('Interview answer must be a string');
  if (answer.length > MAX_ANSWER_LENGTH) throw new Error(`Interview answer exceeds ${MAX_ANSWER_LENGTH} characters`);
  const all = await readAll();
  const index = all.findIndex(x => x.tenantId === tenantId && x.id === interviewId);
  if (index < 0) return null;
  const existing = all[index];
  all[index] = {
    ...existing,
    answers: [...existing.answers, { questionId, answer, capturedAt: new Date().toISOString() }],
    status: 'in_progress',
    updatedAt: new Date().toISOString(),
  };
  await writeAll(all);
  return all[index];
}

export async function completeInterview(tenantId: string, interviewId: string, evidence: any): Promise<SavedInterview | null> {
  requireInterviewIdentity(tenantId);
  if (!interviewId?.trim()) throw new Error('Interview interviewId is required');
  const all = await readAll();
  const index = all.findIndex(x => x.tenantId === tenantId && x.id === interviewId);
  if (index < 0) return null;
  all[index] = { ...all[index], evidence, status: 'completed', updatedAt: new Date().toISOString() };
  await writeAll(all);
  return all[index];
}
