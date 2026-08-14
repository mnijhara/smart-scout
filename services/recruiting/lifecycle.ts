export interface OfferInput {
  candidateName: string;
  role: string;
  company: string;
  base: number;
  currency: string;
  bonus?: number;
  equity?: string;
  startDate?: string;
  manager?: string;
  approvalId: string;
}

export type OfferStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'declined';
export interface OfferPackage extends OfferInput { status: OfferStatus; generatedAt: string; updatedAt?: string; }
export interface EngagementStep { id: string; timing: string; channel: 'email' | 'calendar' | 'task'; subject: string; objective: string; required: boolean; }
export interface OnboardingPlan { role: string; startDate?: string; manager?: string; steps: Array<{ id: string; due: string; owner: string; task: string; system?: string }>; hrisPayload: Record<string, unknown>; }

export function createOffer(input: OfferInput): OfferPackage { return { ...input, status: 'pending_approval', generatedAt: new Date().toISOString() }; }

const OFFER_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  draft: ['pending_approval'],
  pending_approval: ['approved', 'declined'],
  approved: ['sent', 'declined'],
  sent: ['accepted', 'declined'],
  accepted: [],
  declined: [],
};
export function transitionOffer(input: OfferPackage, nextStatus: OfferStatus): OfferPackage {
  if (!OFFER_TRANSITIONS[input.status]?.includes(nextStatus)) throw new Error(`Invalid offer transition: ${input.status} → ${nextStatus}`);
  return { ...input, status: nextStatus, updatedAt: new Date().toISOString() };
}

export function buildEngagementPlan(candidateName: string): EngagementStep[] {
  return [
    { id: 'welcome', timing: 'Immediately after acceptance', channel: 'email', subject: `Welcome to the team, ${candidateName}`, objective: 'Confirm acceptance and establish a warm relationship.', required: true },
    { id: 'manager_intro', timing: 'T-21 days', channel: 'calendar', subject: 'Manager introduction', objective: 'Create an early connection with the hiring manager.', required: true },
    { id: 'docs', timing: 'T-14 days', channel: 'task', subject: 'Preboarding documents', objective: 'Collect and validate required documents.', required: true },
    { id: 'culture', timing: 'T-7 days', channel: 'email', subject: 'Your first week at the company', objective: 'Reduce first-day uncertainty and improve readiness.', required: false },
    { id: 'joining', timing: 'T-1 day', channel: 'email', subject: 'Tomorrow is your first day', objective: 'Confirm joining logistics.', required: true },
  ];
}

export function buildOnboardingPlan(input: { role: string; candidateName: string; startDate?: string; manager?: string; department?: string; location?: string }): OnboardingPlan {
  const start = input.startDate || 'TBD';
  return { role: input.role, startDate: input.startDate, manager: input.manager,
    steps: [
      { id: 'hris', due: 'Before start', owner: 'HR', task: 'Create employee record in customer HRIS', system: 'HRIS API' },
      { id: 'it', due: 'Before start', owner: 'IT', task: 'Provision identity, laptop and access' },
      { id: 'manager', due: 'Day 1', owner: input.manager || 'Hiring Manager', task: 'Run manager onboarding and role briefing' },
      { id: 'team', due: 'Day 1', owner: input.manager || 'Hiring Manager', task: 'Introduce candidate to team' },
      { id: '30-60-90', due: 'First week', owner: input.manager || 'Hiring Manager', task: 'Agree 30/60/90 day plan' },
    ],
    hrisPayload: { name: input.candidateName, jobTitle: input.role, department: input.department, location: input.location, manager: input.manager, startDate: start },
  };
}
