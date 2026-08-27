import fs from 'node:fs';
import assert from 'node:assert/strict';

const scheduler = fs.readFileSync('components/InterviewScheduler.tsx', 'utf8');
const app = fs.readFileSync('App.tsx', 'utf8');
const calendar = fs.readFileSync('src/lib/calendarUtils.ts', 'utf8');
const persistence = fs.readFileSync('services/supabase.ts', 'utf8');

// Scheduling must refuse missing/invalid candidate identity data before sending an invite.
assert.match(scheduler, /if \(!activeName \|\| !activeEmail \|\| !recruiterEmail\)/);
assert.match(scheduler, /if \(!activeEmail\.includes\('@'\) \|\| !recruiterEmail\.includes\('@'\)\)/);

// A successful invitation must be the point at which the scheduled session is persisted.
assert.match(scheduler, /fetch\('\/api\/send-invitation'/);
assert.match(scheduler, /\.then\(\(\) => \{/);
assert.match(scheduler, /onSchedule\(session\)/);
assert.doesNotMatch(scheduler, /candidateEmail:\s*['"](?:test|candidate|rohan)[^'"\n]*@/i);

// Recruiter-side scheduling must persist the exact session produced by the scheduler.
assert.match(app, /onSchedule=\{async \(session\) => \{\s*await saveInterviewSession\(session\)/);
assert.match(persistence, /setDoc\(doc\(db, ['"]interview_sessions['"], session\.id\)/);

// Calendar IDs must be stable for the same candidate/time pair and visibly derive from
// normalized candidate identity plus the scheduled start time.
assert.match(calendar, /function createEventUid\(candidateName: string, startTime: Date\)/);
assert.match(calendar, /candidateName\.trim\(\)\.toLowerCase\(\)/);
assert.match(calendar, /startTime\.getTime\(\)/);
assert.match(calendar, /UID:\$\{createEventUid\(candidateName, startTime\)\}/);

console.log('Interview persistence regression checks passed.');
