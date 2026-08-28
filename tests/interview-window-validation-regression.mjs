import assert from 'node:assert/strict';
import { isValidInterviewWindow } from '../services/recruiting/controlPlane.ts';

assert.equal(isValidInterviewWindow('2026-08-28T10:00:00Z', '2026-08-28T10:30:00Z'), true);
assert.equal(isValidInterviewWindow('2026-08-28T10:30:00Z', '2026-08-28T10:00:00Z'), false);
assert.equal(isValidInterviewWindow('2026-08-28T10:00:00Z', '2026-08-28T10:00:00Z'), false);
assert.equal(isValidInterviewWindow('not-a-date', '2026-08-28T10:30:00Z'), false);
assert.equal(isValidInterviewWindow('2026-08-28T10:00:00Z', 'not-a-date'), false);

console.log('Interview timestamp validation checks passed.');
