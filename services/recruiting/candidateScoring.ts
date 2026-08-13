import { generateAI } from './aiGateway';
import type { CandidateScore, HiringRequirement } from './types';

export interface CandidateInput {
  name: string;
  resumeText?: string;
  profileText?: string;
  experienceYears?: number;
  location?: string;
  currentCompensation?: number;
  expectedCompensation?: number;
  noticePeriodDays?: number;
}

export async function scoreCandidate(
  candidate: CandidateInput,
  requirement: HiringRequirement,
  provider: Parameters<typeof generateAI>[0]['provider'],
  apiKey: string,
  model?: string,
): Promise<CandidateScore> {
  const prompt = `Score this candidate against the hiring requirement. Return ONLY JSON: {"overall":number,"experience":number,"skills":number,"roleFit":number,"leadership":number,"compensationFit":number,"availabilityFit":number,"strengths":string[],"concerns":string[],"evidence":[{"source":string,"field":string,"value":string,"confidence":number,"capturedAt":string}],"recommendation":"strong_yes|yes|maybe|no"}. Scores 0-100. Use only evidence supplied. Do not infer protected characteristics.\n\nREQUIREMENT:\n${JSON.stringify(requirement)}\n\nCANDIDATE:\n${JSON.stringify(candidate)}`;
  const response = await generateAI({ provider, apiKey, model, system: 'You are an explainable recruiting scorer. Never use protected characteristics. Cite evidence.', prompt, temperature: 0, maxTokens: 3500 });
  const cleaned = response.text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const score = JSON.parse(cleaned) as CandidateScore;
  return {
    ...score,
    overall: Math.max(0, Math.min(100, Number(score.overall) || 0)),
    strengths: Array.isArray(score.strengths) ? score.strengths : [],
    concerns: Array.isArray(score.concerns) ? score.concerns : [],
    evidence: Array.isArray(score.evidence) ? score.evidence : [],
  };
}
