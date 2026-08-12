import { ApprovalGate, HiringStage, HiringWorkflow } from './types';

export const DEFAULT_APPROVAL_GATES: ApprovalGate[] = [
  'interview_decision',
  'candidate_rejection',
  'compensation',
  'offer',
  'employee_creation',
];

const STAGE_ORDER: HiringStage[] = [
  'job',
  'source',
  'screen',
  'interview',
  'decision',
  'comp',
  'offer',
  'engagement',
  'onboard',
];

export function nextHiringStage(stage: HiringStage): HiringStage | null {
  const index = STAGE_ORDER.indexOf(stage);
  return index >= 0 && index < STAGE_ORDER.length - 1 ? STAGE_ORDER[index + 1] : null;
}

export function isApprovalRequired(gate: ApprovalGate, workflow: HiringWorkflow): boolean {
  return workflow.approvalGates.includes(gate);
}

export function advanceWorkflow(workflow: HiringWorkflow): HiringWorkflow {
  const next = nextHiringStage(workflow.stage);
  if (!next) return workflow;
  return { ...workflow, stage: next, updatedAt: new Date().toISOString() };
}
