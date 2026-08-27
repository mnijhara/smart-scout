import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');
const start = source.indexOf('export async function scheduleInterview');
const end = source.indexOf('export async function updateSchedule');
assert.ok(start >= 0 && end > start, 'scheduleInterview implementation must exist');
const implementation = source.slice(start, end);

assert.match(
  implementation,
  /const value=await mutate<InterviewSchedule>\(files\.schedules,/,
  'interview scheduling must serialize validation and persistence through the mutation queue',
);
assert.doesNotMatch(
  implementation,
  /const existing=await read<InterviewSchedule>\(files\.schedules\);/,
  'overlap validation must not read schedules outside the mutation queue',
);
assert.match(
  implementation,
  /all\.find\(x=>x\.tenantId===input\.tenantId&&x\.status!=='cancelled'/,
  'overlap validation must remain tenant-scoped and ignore cancelled bookings',
);

console.log('Interview overlap atomicity regression: PASS');
