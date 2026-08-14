import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type SavedCandidate = {
  id: string;
  tenantId: string;
  jobId: string;
  candidate: any;
  score?: any;
  createdAt: string;
  updatedAt: string;
};

const filePath = process.env.SMARTSCOUT_CANDIDATE_STORE || path.join(process.cwd(), '.smartscout-candidates.json');
let writeQueue = Promise.resolve();
async function readAll(): Promise<SavedCandidate[]> { try { return JSON.parse(await fs.readFile(filePath, 'utf8')); } catch { return []; } }
export async function saveCandidates(tenantId: string, jobId: string, candidates: any[]): Promise<SavedCandidate[]> {
  const now = new Date().toISOString();
  const saved = candidates.map(candidate => ({ id: `candidate_${crypto.randomUUID()}`, tenantId, jobId, candidate, createdAt: now, updatedAt: now }));
  writeQueue = writeQueue.then(async () => { const all = await readAll(); const kept = all.filter(x => !(x.tenantId === tenantId && x.jobId === jobId)); await fs.writeFile(filePath, JSON.stringify([...saved, ...kept].slice(0, 5000), null, 2), 'utf8'); });
  await writeQueue;
  return saved;
}
export async function listCandidates(tenantId: string, jobId: string): Promise<SavedCandidate[]> { return (await readAll()).filter(x => x.tenantId === tenantId && x.jobId === jobId); }
export async function updateCandidateScore(tenantId: string, id: string, score: any): Promise<SavedCandidate | null> {
  const all = await readAll(); const index = all.findIndex(x => x.tenantId === tenantId && x.id === id); if (index < 0) return null;
  all[index] = { ...all[index], score, updatedAt: new Date().toISOString() }; await fs.writeFile(filePath, JSON.stringify(all, null, 2), 'utf8'); return all[index];
}
