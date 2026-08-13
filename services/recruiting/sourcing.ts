import type { CandidateEvidence, RecruitingCandidate } from './types';

export type SourceKind = 'api' | 'browser' | 'ats' | 'career_site';

export interface SearchRequest {
  query: string;
  location?: string;
  limit?: number;
}

export interface SourceCandidate {
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  profileUrl?: string;
  headline?: string;
  location?: string;
  resumeText?: string;
  source: string;
  evidence?: CandidateEvidence[];
}

export interface SourcingConnector {
  id: string;
  kind: SourceKind;
  provider: string;
  search(request: SearchRequest): Promise<SourceCandidate[]>;
  getProfile?(externalId: string): Promise<SourceCandidate | null>;
}

export function normalizeCandidate(source: SourceCandidate): RecruitingCandidate {
  return {
    id: `${source.provider}:${source.externalId}`,
    name: source.name,
    email: source.email,
    phone: source.phone,
    profileUrl: source.profileUrl,
    source: source.source,
    resumeText: source.resumeText,
    status: 'discovered',
  };
}

export function deduplicateCandidates(candidates: RecruitingCandidate[]): RecruitingCandidate[] {
  const byKey = new Map<string, RecruitingCandidate>();
  for (const candidate of candidates) {
    const email = candidate.email?.trim().toLowerCase();
    const profile = candidate.profileUrl?.trim().toLowerCase();
    const key = email || profile || candidate.name.trim().toLowerCase();
    if (!byKey.has(key)) byKey.set(key, candidate);
    else {
      const existing = byKey.get(key)!;
      byKey.set(key, {
        ...existing,
        resumeText: existing.resumeText || candidate.resumeText,
        email: existing.email || candidate.email,
        phone: existing.phone || candidate.phone,
      });
    }
  }
  return [...byKey.values()];
}

export function buildSearchQueries(title: string, mustHave: string[], location?: string): string[] {
  const skills = mustHave.slice(0, 8);
  const queries = [title, `${title} ${skills.slice(0, 3).join(' ')}`, `${title} ${skills.slice(3, 6).join(' ')}`];
  return queries.map(q => location ? `${q} ${location}` : q).filter(Boolean);
}

export async function sourceCandidates(connectors: SourcingConnector[], requests: SearchRequest[]): Promise<RecruitingCandidate[]> {
  const results = await Promise.all(connectors.flatMap(connector => requests.map(request => connector.search(request))));
  return deduplicateCandidates(results.flat().map(normalizeCandidate));
}
