import { generateAI } from './aiGateway';
import type { HiringRequirement } from './types';

export type JDIntelligence = HiringRequirement & {
  competencies: string[];
  interviewFocus: string[];
  sourcingKeywords: string[];
  redFlags: string[];
  questions: string[];
};

const fallback = (text: string): JDIntelligence => ({
  title: 'Untitled role',
  description: text.slice(0, 4000),
  mustHave: [],
  niceToHave: [],
  location: undefined,
  experienceMin: undefined,
  experienceMax: undefined,
  compensationMin: undefined,
  compensationMax: undefined,
  department: undefined,
  competencies: [],
  interviewFocus: [],
  sourcingKeywords: [],
  redFlags: [],
  questions: [],
});

export async function analyzeJD(jdText: string, provider: Parameters<typeof generateAI>[0]['provider'], apiKey: string, model?: string): Promise<JDIntelligence> {
  const prompt = `Analyze this job description for a recruiting operating system. Return ONLY valid JSON matching this schema: {"title":string,"description":string,"mustHave":string[],"niceToHave":string[],"location":string|null,"experienceMin":number|null,"experienceMax":number|null,"compensationMin":number|null,"compensationMax":number|null,"department":string|null,"competencies":string[],"interviewFocus":string[],"sourcingKeywords":string[],"redFlags":string[],"questions":string[]}. Do not invent compensation if absent. Extract measurable requirements and separate must-have from nice-to-have.\n\nJD:\n${jdText}`;
  try {
    const result = await generateAI({
      provider,
      apiKey,
      model,
      system: 'You are Smart Scout Job Intelligence. Be conservative and evidence based.',
      prompt,
      temperature: 0,
      maxTokens: 3500,
    });
    const cleaned = result.text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(cleaned) as JDIntelligence;
  } catch {
    return fallback(jdText);
  }
}
