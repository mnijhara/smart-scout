import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');
const start = source.indexOf('export async function scheduleInterview');
const end = source.indexOf('export async function updateSchedule');
assert.ok(start >= 0 && end > start, 'scheduleInterview implementation must exist');
const implementation = source.slice(start, end);

assert.match(implementation, /const existing=await read<InterviewSchedule>\(files\.schedules\);/);
assert.match(implementation, /x\.tenantId===input\.tenantId/);
assert.match(implementation, /x\.status!=='cancelled'/);
assert.match(implementation, /new Date\(input\.startsAt\)<new Date\(x\.endsAt\)/);
assert.match(implementation, /new Date\(input\.endsAt\)>new Date\(x\.startsAt\)/);
assert.match(implementation, /Interview time overlaps an existing booking/);
assert.match(implementation, /action:'interview_scheduled'/);

console.log('Control-plane interview overlap regression: PASS');
