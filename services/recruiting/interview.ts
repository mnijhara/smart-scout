export interface InterviewQuestion {
  id: string;
  competency: string;
  question: string;
  followUp?: string;
  scoringRubric: string;
}

export interface InterviewPlan {
  durationMinutes: number;
  questions: InterviewQuestion[];
  intro: string;
  closing: string;
}

export function buildInterviewPlan(role: string, competencies: string[]): InterviewPlan {
  const topics = (competencies.length ? competencies : ['role expertise', 'problem solving', 'stakeholder management', 'leadership']).slice(0, 8);
  return {
    durationMinutes: Math.min(30, 8 + topics.length * 3),
    intro: `Hello. This structured Smart Scout interview is for the ${role} role. We will ask questions about the role requirements and your experience.`,
    closing: 'Thank you. Your responses will be reviewed against the role requirements.',
    questions: topics.map((topic, index) => ({
      id: `q${index + 1}`,
      competency: topic,
      question: `Tell us about a specific example that demonstrates your strength in ${topic}. What was the context, what did you personally do, and what was the measurable outcome?`,
      followUp: 'What would you do differently next time?',
      scoringRubric: 'Score evidence, ownership, complexity, reasoning and measurable outcome from 0-100. Do not score protected characteristics.',
    })),
  };
}
