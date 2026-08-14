import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type SavedJob = {
  id: string;
  tenantId: string;
  prompt: string;
  analysis: any;
  createdAt: string;
  updatedAt: string;
};

const filePath = process.env.SMARTSCOUT_JOB_STORE || path.join(process.cwd(), '.smartscout-jobs.json');
let writeQueue = Promise.resolve();

async function readAll(): Promise<SavedJob[]> {
  try { return JSON.parse(await fs.readFile(filePath, 'utf8')); }
  catch { return []; }
}

export async function createJob(tenantId: string, prompt: string, analysis: any): Promise<SavedJob> {
  const now = new Date().toISOString();
  const job: SavedJob = { id: `job_${crypto.randomUUID()}`, tenantId, prompt, analysis, createdAt: now, updatedAt: now };
  writeQueue = writeQueue.then(async () => {
    const jobs = await readAll();
    jobs.unshift(job);
    await fs.writeFile(filePath, JSON.stringify(jobs.slice(0, 500), null, 2), 'utf8');
  });
  await writeQueue;
  return job;
}

export const saveJob = createJob;

export async function getJob(tenantId: string, id: string): Promise<SavedJob | null> {
  return (await readAll()).find(job => job.tenantId === tenantId && job.id === id) || null;
}

export async function listJobs(tenantId: string): Promise<SavedJob[]> {
  return (await readAll()).filter(job => job.tenantId === tenantId);
}
