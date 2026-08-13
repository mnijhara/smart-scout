import type { CandidateScore } from './types';

export interface DecisionInput {
  resume: CandidateScore;
  interview?: CandidateScore;
  roleFitOverride?: number;
}

export interface HiringDecision {
  score: number;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
  reasons: string[];
  approvalRequired: boolean;
}

export function makeHiringDecision(input: DecisionInput): HiringDecision {
  const resumeWeight = input.interview ? 0.55 : 0.8;
  const interviewWeight = input.interview ? 0.45 : 0.2;
  const interviewScore = input.interview?.overall ?? input.resume.overall;
  const score = Math.round(input.resume.overall * resumeWeight + interviewScore * interviewWeight);
  const adjusted = typeof input.roleFitOverride === 'number' ? Math.round(score * 0.8 + input.roleFitOverride * 0.2) : score;
  const recommendation = adjusted >= 90 ? 'strong_yes' : adjusted >= 80 ? 'yes' : adjusted >= 65 ? 'maybe' : 'no';
  const reasons = [...input.resume.strengths.slice(0, 3)];
  if (input.interview) reasons.push(...input.interview.strengths.slice(0, 2).map(reason => `Interview: ${reason}`));
  reasons.push(...input.resume.concerns.slice(0, 2).map(reason => `Concern: ${reason}`));
  return { score: adjusted, recommendation, reasons, approvalRequired: true };
}
