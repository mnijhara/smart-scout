import assert from 'node:assert/strict';
import { isAllowedScheduleTransition } from '../services/recruiting/controlPlane.ts';

assert.equal(isAllowedScheduleTransition('proposed', 'confirmed'), true);
assert.equal(isAllowedScheduleTransition('proposed', 'cancelled'), true);
assert.equal(isAllowedScheduleTransition('confirmed', 'cancelled'), true);
assert.equal(isAllowedScheduleTransition('confirmed', 'proposed'), false);
assert.equal(isAllowedScheduleTransition('cancelled', 'confirmed'), false);
assert.equal(isAllowedScheduleTransition('cancelled', 'proposed'), false);

console.log('Interview lifecycle state-machine checks passed.');
