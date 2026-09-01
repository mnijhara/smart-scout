import type { SavedCandidate } from './candidateStore.js';

export function assertCandidateBelongsToJob(
  candidate: SavedCandidate | null | undefined,
  tenantId: string,
  jobId: string,
  candidateId: string,
): SavedCandidate {
  const tenant = String(tenantId ?? '').trim();
  const job = String(jobId ?? '').trim();
  const id = String(candidateId ?? '').trim();

  if (!tenant || !job || !id) throw new Error('Candidate ownership context is required');
  if (!candidate || candidate.tenantId !== tenant || candidate.jobId !== job || candidate.id !== id) {
    throw new Error('Candidate does not belong to this tenant and job');
  }
  return candidate;
}
