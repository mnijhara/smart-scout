import { readFile } from 'node:fs/promises';
import path from 'node:path';

const migrationPath = path.resolve('supabase/migrations/030_candidate_lifecycle_status_constraint.sql');
const migration = await readFile(migrationPath, 'utf8');

const supportedStatuses = [
  'discovered',
  'screened',
  'shortlisted',
  'interview',
  'selected',
  'rejected',
  'offered',
  'accepted',
  'onboarded',
];

const constraint = migration.match(/check\s*\(\s*status\s+in\s*\(([^)]*)\)\s*\)/i)?.[1] ?? '';
for (const status of supportedStatuses) {
  if (!new RegExp(`['\\\"]${status}['\\\"]`, 'i').test(constraint)) {
    throw new Error(`Candidate lifecycle constraint must include supported status: ${status}`);
  }
}

for (const unsupportedStatus of ['screening', 'hired', 'completed']) {
  if (new RegExp(`['\\\"]${unsupportedStatus}['\\\"]`, 'i').test(constraint)) {
    throw new Error(`Candidate lifecycle constraint must not reintroduce unsupported status: ${unsupportedStatus}`);
  }
}

if (!/validate\s+constraint\s+recruiting_candidates_status_check/i.test(migration)) {
  throw new Error('Candidate lifecycle constraint must be validated after creation');
}

console.log('Hiring lifecycle status contract regression passed');
