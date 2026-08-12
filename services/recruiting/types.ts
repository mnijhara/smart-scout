export type HiringStage =
  | 'job'
  | 'source'
  | 'screen'
  | 'interview'
  | 'decision'
  | 'comp'
  | 'offer'
  | 'engagement'
  | 'onboard';

export type ApprovalGate =
  | 'jd_publish'
  | 'outreach'
  | 'interview_decision'
  | 'candidate_rejection'
  | 'compensation'
  | 'offer'
  | 'employee_creation';

export interface HiringRequirement {
  title: string;
  description: string;
  mustHave: string[];
  niceToHave: string[];
  location?: string;
  experienceMin?: number;
  experienceMax?: number;
  compensationMin?: number;
  compensationMax?: number;
  department?: string;
}

export interface CandidateEvidence {
  source: string;
  field: string;
  value: string;
  confidence: number;
  capturedAt: string;
}

export interface CandidateScore {
  overall: number;
  experience: number;
  skills: number;
  roleFit: number;
  leadership: number;
  compensationFit?: number;
  availabilityFit?: number;
  strengths: string[];
  concerns: string[];
  evidence: CandidateEvidence[];
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
}

export interface RecruitingCandidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profileUrl?: string;
  source: string;
  resumeText?: string;
  score?: CandidateScore;
  interviewScore?: number;
  status: 'discovered' | 'screened' | 'shortlisted' | 'interview' | 'selected' | 'rejected' | 'offered' | 'accepted' | 'onboarded';
}

export interface IntegrationConfig {
  id: string;
  type: 'ai' | 'source' | 'communication' | 'calendar' | 'compensation' | 'hris';
  provider: string;
  enabled: boolean;
  capabilities: string[];
}

export interface HiringWorkflow {
  id: string;
  tenantId: string;
  role: HiringRequirement;
  stage: HiringStage;
  approvalGates: ApprovalGate[];
  candidates: RecruitingCandidate[];
  integrations: IntegrationConfig[];
  createdAt: string;
  updatedAt: string;
}
