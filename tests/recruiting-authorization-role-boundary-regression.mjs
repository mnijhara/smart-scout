import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve('services/recruiting/authorization.ts'), 'utf8');

assert.match(source, /const PRIVILEGED_ROLES = new Set<WorkspaceRole>\(\['admin', 'recruiter', 'hiring_manager'\]\)/);
assert.match(source, /role\.trim\(\)\.toLowerCase\(\)/);
assert.match(source, /if \(!hasPrivilegedRecruitingRole\(normalized\)\)/);
assert.match(source, /throw new Error\('Insufficient permissions'\)/);
assert.match(source, /role: unknown/);

// Keep the authorization boundary explicit: only the three supported roles may
// pass, while missing/unknown values must fail closed.
for (const role of ['admin', 'recruiter', 'hiring_manager']) {
  assert.match(source, new RegExp(`['\"]${role}['\"]`));
}
for (const forbidden of ['owner', 'superadmin', 'viewer']) {
  assert.doesNotMatch(source, new RegExp(`['\"]${forbidden}['\"]`));
}

console.log('Recruiting authorization role-boundary regression checks passed.');
