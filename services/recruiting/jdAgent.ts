import { generateAI } from './aiGateway.js';
import type { HiringRequirement } from './types.js';

export type JDIntelligence = HiringRequirement & {
  competencies: string[];
  interviewFocus: string[];
  sourcingKeywords: string[];
  redFlags: string[];
  questions: string[];
};

export async function analyzeJD(
  jdText: string,
  provider: Parameters<typeof generateAI>[0]['provider'],
  apiKey: string,
  model?: string,
): Promise<JDIntelligence> {
  const prompt = `Analyze this job description for a recruiting operating system. Return ONLY valid JSON matching this schema: {"title":string,"description":string,"mustHave":string[],"niceToHave":string[],"location":string|null,"experienceMin":number|null,"experienceMax":number|null,"compensationMin":number|null,"compensationMax":number|null,"department":string|null,"competencies":string[],"interviewFocus":string[],"sourcingKeywords":string[],"redFlags":string[],"questions":string[]}. Do not invent compensation if absent. Extract measurable requirements and separate must-have from nice-to-have.\n\nJD:\n${jdText}`;
  const result = await generateAI({
    provider,
    apiKey,
    model,
    system: 'You are Smart Scout Job Intelligence. Be conservative and evidence based. Never fabricate missing requirements.',
    prompt,
    temperature: 0,
    maxTokens: 3500,
  });
  const cleaned = result.text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  let parsed: JDIntelligence;
  try {
    parsed = JSON.parse(cleaned) as JDIntelligence;
  } catch {
    throw new Error('Gemini returned an invalid hiring blueprint. Please retry the JD request.');
  }
  if (!parsed.title || !parsed.description) throw new Error('Gemini returned an incomplete hiring blueprint. Please retry the JD request.');
  return parsed;
}
