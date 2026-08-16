import type { RecruitingCandidate, HiringRequirement } from './types';

export type KnockoutCriterion = {
  id: string;
  label: string;
  type: 'required_skill' | 'min_experience' | 'location' | 'work_authorization' | 'custom';
  value: string | number;
  hard: boolean;
};

export type KnockoutResult = {
  candidateId: string;
  passed: boolean;
  hardFailures: string[];
  warnings: string[];
  checks: Array<{ id: string; label: string; passed: boolean; evidence?: string }>;
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();

export function deriveKnockoutCriteria(requirement: HiringRequirement): KnockoutCriterion[] {
  return [
    ...requirement.mustHave.map((skill, index) => ({ id: `skill-${index + 1}`, label: skill, type: 'required_skill' as const, value: skill, hard: true })),
    ...(requirement.experienceMin != null ? [{ id: 'experience-min', label: 'Minimum experience', type: 'min_experience' as const, value: requirement.experienceMin, hard: true }] : []),
    ...(requirement.location ? [{ id: 'location', label: 'Location', type: 'location' as const, value: requirement.location, hard: false }] : []),
  ];
}

export function runKnockout(candidate: RecruitingCandidate & { experienceYears?: number; location?: string; workAuthorization?: string }, criteria: KnockoutCriterion[]): KnockoutResult {
  const text = normalize([candidate.resumeText || '', candidate.name, candidate.profileUrl || ''].join(' '));
  const checks = criteria.map((criterion) => {
    if (criterion.type === 'required_skill') {
      const target = normalize(String(criterion.value));
      const passed = text.includes(target) || (candidate.score?.evidence || []).some(e => normalize(e.value).includes(target));
      return { id: criterion.id, label: criterion.label, passed, evidence: passed ? `Evidence matched: ${criterion.value}` : undefined };
    }
    if (criterion.type === 'min_experience') {
      const years = candidate.experienceYears ?? Number(candidate.score?.experience || 0) / 10;
      const passed = years >= Number(criterion.value);
      return { id: criterion.id, label: criterion.label, passed, evidence: `Estimated experience: ${years.toFixed(1)} years` };
    }
    if (criterion.type === 'location') {
      const location = normalize(candidate.location || '');
      const target = normalize(String(criterion.value));
      const passed = !location || location.includes(target) || target.includes(location);
      return { id: criterion.id, label: criterion.label, passed, evidence: candidate.location ? `Candidate location: ${candidate.location}` : 'Location not provided' };
    }
    if (criterion.type === 'work_authorization') {
      const passed = normalize(candidate.workAuthorization || '') === normalize(String(criterion.value));
      return { id: criterion.id, label: criterion.label, passed, evidence: candidate.workAuthorization || 'Not provided' };
    }
    return { id: criterion.id, label: criterion.label, passed: true, evidence: 'Custom criterion requires recruiter review' };
  });
  const hardFailures = checks.filter((check, index) => !check.passed && criteria[index]?.hard).map(check => check.label);
  const warnings = checks.filter((check, index) => !check.passed && !criteria[index]?.hard).map(check => check.label);
  return { candidateId: candidate.id, passed: hardFailures.length === 0, hardFailures, warnings, checks };
}

export type CandidateComparison = {
  candidateId: string;
  rank: number;
  overall: number;
  strengths: string[];
  concerns: string[];
  knockout: KnockoutResult;
};

export function compareCandidates(candidates: Array<RecruitingCandidate & { experienceYears?: number; location?: string; workAuthorization?: string }>, requirement: HiringRequirement): CandidateComparison[] {
  const criteria = deriveKnockoutCriteria(requirement);
  return candidates.map(candidate => {
    const knockout = runKnockout(candidate, criteria);
    const score = candidate.score?.overall ?? 0;
    const penalty = knockout.hardFailures.length ? 100 : knockout.warnings.length * 5;
    return { candidateId: candidate.id, rank: 0, overall: Math.max(0, score - penalty), strengths: candidate.score?.strengths || [], concerns: [...(candidate.score?.concerns || []), ...knockout.hardFailures], knockout };
  }).sort((a, b) => b.overall - a.overall).map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

export type IntegrationHealth = { id: string; provider: string; configured: boolean; capabilities: string[]; missing: string[] };

export function integrationHealth(env: NodeJS.ProcessEnv = process.env): IntegrationHealth[] {
  return [
    { id: 'resend', provider: 'Resend', configured: Boolean(env.RESEND_API_KEY), capabilities: ['offer-email', 'interview-email', 'report-email'], missing: env.RESEND_API_KEY ? [] : ['RESEND_API_KEY'] },
    { id: 'supabase', provider: 'Supabase', configured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY), capabilities: ['persistent-state', 'audit', 'documents'], missing: [env.SUPABASE_URL ? '' : 'SUPABASE_URL', env.SUPABASE_SERVICE_ROLE_KEY ? '' : 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean) },
    { id: 'linkedin', provider: 'LinkedIn licensed API', configured: Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET), capabilities: ['licensed-source'], missing: [env.LINKEDIN_CLIENT_ID ? '' : 'LINKEDIN_CLIENT_ID', env.LINKEDIN_CLIENT_SECRET ? '' : 'LINKEDIN_CLIENT_SECRET'].filter(Boolean) },
    { id: 'naukri', provider: 'Naukri licensed API', configured: Boolean(env.NAUKRI_CLIENT_ID && env.NAUKRI_CLIENT_SECRET), capabilities: ['licensed-source'], missing: [env.NAUKRI_CLIENT_ID ? '' : 'NAUKRI_CLIENT_ID', env.NAUKRI_CLIENT_SECRET ? '' : 'NAUKRI_CLIENT_SECRET'].filter(Boolean) },
    { id: 'calendar', provider: env.CALENDAR_PROVIDER || 'Calendar provider', configured: Boolean(env.CALENDAR_API_URL && env.CALENDAR_API_TOKEN), capabilities: ['scheduling', 'secure-links'], missing: [env.CALENDAR_API_URL ? '' : 'CALENDAR_API_URL', env.CALENDAR_API_TOKEN ? '' : 'CALENDAR_API_TOKEN'].filter(Boolean) },
    { id: 'transcription', provider: env.TRANSCRIPTION_PROVIDER || 'Transcription provider', configured: Boolean(env.TRANSCRIPTION_API_URL && env.TRANSCRIPTION_API_KEY), capabilities: ['transcription'], missing: [env.TRANSCRIPTION_API_URL ? '' : 'TRANSCRIPTION_API_URL', env.TRANSCRIPTION_API_KEY ? '' : 'TRANSCRIPTION_API_KEY'].filter(Boolean) },
    { id: 'compensation', provider: env.COMPENSATION_PROVIDER || 'Compensation data provider', configured: Boolean(env.COMPENSATION_API_URL && env.COMPENSATION_API_KEY), capabilities: ['market-data'], missing: [env.COMPENSATION_API_URL ? '' : 'COMPENSATION_API_URL', env.COMPENSATION_API_KEY ? '' : 'COMPENSATION_API_KEY'].filter(Boolean) },
    { id: 'hris', provider: env.HRIS_PROVIDER || 'HRIS provider', configured: Boolean(env.HRIS_API_URL && env.HRIS_API_TOKEN), capabilities: ['employee-create', 'documents', 'tasks'], missing: [env.HRIS_API_URL ? '' : 'HRIS_API_URL', env.HRIS_API_TOKEN ? '' : 'HRIS_API_TOKEN'].filter(Boolean) },
  ];
}

export async function postJson(url: string, token: string, body: unknown, timeoutMs = 15000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    const text = await response.text();
    let data: any = null; try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!response.ok) throw new Error(data?.error?.message || data?.error || `Integration request failed (${response.status})`);
    return data;
  } finally { clearTimeout(timeout); }
}
