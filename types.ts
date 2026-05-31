
export interface ScoreBreakdown {
  "Relevant Experience": number;
  "Technical Skills": number;
  "Education": number;
  "Soft Skills": number;
}

export interface ResumeAnalysis {
  fileName: string;
  candidateName: string;
  overallScore: number;
  summary: string;
  pros: string[];
  cons: string[];
  breakdown: ScoreBreakdown;
  extractedText: string;
  biasAudit?: {
    score: number;
    feedback: string;
    fairnessCheck: string;
  };
  selfie?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type InterviewType = 'consultant' | 'recruiter' | 'functional';

export interface InterviewQuestion {
  question: string;
  purpose: string;
  expectedAnswer?: string;
  strongAnswer?: string;
  weakAnswer?: string;
  scoringRubric?: {
    [key: number]: string;
  };
}

export interface InterviewPlaybook {
  candidateName: string;
  strategy: string;
  questions: InterviewQuestion[];
}

export interface InterviewResponse {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  evidence: string;
}

export interface InterviewReport {
  candidateName: string;
  overallScore: number;
  status: 'Selected' | 'Rejected' | 'Waitlisted';
  reason: string;
  parameters: {
    name: string;
    score: number;
    feedback: string;
  }[];
  responses: InterviewResponse[];
  softSkills?: {
    confidence: number;
    clarity: number;
    enthusiasm: number;
    feedback: string;
  };
  biasAudit?: {
    score: number;
    feedback: string;
    fairnessCheck: string;
  };
  complianceAudit?: {
    framework: string;
    status: string;
    details: string;
  };
  interestLevel?: {
    score: number;
    feedback: string;
    locationFit: string;
    salaryAlignment: string;
    roleAlignment: string;
    companyAlignment: string;
  };
  selfie?: string;
}

export interface InterviewSession {
  id: string;
  user_id?: string;
  candidateName: string;
  candidateEmail: string;
  recruiterEmail?: string;
  webhookUrl?: string;
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
    companyName?: string;
  };
  jd: string;
  cvText: string;
  questions: InterviewQuestion[];
  responses: { question: string, answer: string }[];
  status: 'scheduled' | 'completed' | 'analyzed';
  scheduledAt?: string;
  emailBody?: string;
  report?: InterviewReport;
  designation?: string;
  company?: string;
  interviewType?: InterviewType;
  language?: string;
  voicePreference?: 'male' | 'female';
  voiceName?: string;
  persona?: string;
  coreRequirementsMap?: string;
}

export interface BulkInterviewCandidate {
  id: string;
  name: string;
  email: string;
  cvText: string;
  status: 'pending' | 'extracting' | 'ready' | 'scheduled' | 'failed';
  error?: string;
}

export interface PostingContent {
  titles: string[];
  summary: string;
  keywords: string[];
}

export interface TalentDensityReport {
  talentDensityScore: number;
  summary: string;
}