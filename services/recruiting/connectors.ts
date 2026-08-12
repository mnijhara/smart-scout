import type { RecruitingCandidate } from './types';

export type SourceSearchRequest = {
  query: string;
  location?: string;
  limit?: number;
};

export type SourceSearchResult = {
  candidates: RecruitingCandidate[];
  source: string;
  nextCursor?: string;
};

export interface RecruitingSourceConnector {
  id: string;
  label: string;
  capabilities: Array<'search' | 'profile' | 'contact' | 'save'>;
  search(request: SourceSearchRequest): Promise<SourceSearchResult>;
  getProfile?(profileUrl: string): Promise<RecruitingCandidate>;
  getContact?(candidateId: string): Promise<Pick<RecruitingCandidate, 'email' | 'phone'>>;
  saveCandidate?(candidate: RecruitingCandidate): Promise<void>;
}

export type ConnectorRegistry = Map<string, RecruitingSourceConnector>;

export function createConnectorRegistry(connectors: RecruitingSourceConnector[] = []): ConnectorRegistry {
  return new Map(connectors.map(connector => [connector.id, connector]));
}

export function normalizeCandidate(candidate: RecruitingCandidate): RecruitingCandidate {
  return {
    ...candidate,
    name: candidate.name.trim().replace(/\s+/g, ' '),
    email: candidate.email?.trim().toLowerCase() || undefined,
    phone: candidate.phone?.trim() || undefined,
    profileUrl: candidate.profileUrl?.trim() || undefined,
  };
}

export function deduplicateCandidates(candidates: RecruitingCandidate[]): RecruitingCandidate[] {
  const seen = new Set<string>();
  const result: RecruitingCandidate[] = [];
  for (const candidate of candidates.map(normalizeCandidate)) {
    const key = [candidate.email, candidate.profileUrl, candidate.name.toLowerCase()].find(Boolean) || candidate.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}

/**
 * Safe HTTP adapter for customer-owned or officially documented APIs.
 * Authentication is supplied by the caller and is never persisted here.
 */
export class JsonApiSourceConnector implements RecruitingSourceConnector {
  id: string;
  label: string;
  capabilities: Array<'search' | 'profile' | 'contact' | 'save'> = ['search'];

  constructor(private config: {
    id: string;
    label: string;
    searchUrl: string;
    headers?: Record<string, string>;
    mapResult: (item: any) => RecruitingCandidate;
  }) {
    this.id = config.id;
    this.label = config.label;
  }

  async search(request: SourceSearchRequest): Promise<SourceSearchResult> {
    const url = new URL(this.config.searchUrl);
    url.searchParams.set('q', request.query);
    if (request.location) url.searchParams.set('location', request.location);
    url.searchParams.set('limit', String(Math.min(request.limit || 25, 100)));

    const response = await fetch(url, {
      headers: { Accept: 'application/json', ...this.config.headers },
    });
    const data: any = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `${this.label} search failed (${response.status})`);

    const items = Array.isArray(data) ? data : (data.items || data.results || data.candidates || []);
    return {
      source: this.id,
      candidates: deduplicateCandidates(items.map(this.config.mapResult)),
      nextCursor: data?.nextCursor || data?.next_cursor,
    };
  }
}
