import assert from 'node:assert/strict';
import { hasPrivilegedRecruitingRole, requirePrivilegedRecruitingRole } from '../services/recruiting/authorization.ts';

assert.equal(hasPrivilegedRecruitingRole(' admin '), true);
assert.equal(requirePrivilegedRecruitingRole(' RECRUITER '), 'recruiter');
assert.equal(hasPrivilegedRecruitingRole('a'.repeat(65)), false);
assert.throws(() => requirePrivilegedRecruitingRole('a'.repeat(65)), /Insufficient permissions/);
assert.equal(hasPrivilegedRecruitingRole(null), false);
assert.equal(hasPrivilegedRecruitingRole({ role: 'admin' }), false);

console.log('Recruiting authorization input boundary regression passed');
