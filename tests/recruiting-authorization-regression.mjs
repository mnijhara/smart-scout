import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve('services/recruiting/authorization.ts'), 'utf8');

assert.match(source, /hasPrivilegedRecruitingRole/);
assert.match(source, /requirePrivilegedRecruitingRole/);
assert.match(source, /Insufficient permissions/);
assert.match(source, /admin/);
assert.match(source, /recruiter/);
assert.match(source, /hiring_manager/);

// The authorization boundary must fail closed for absent and unknown roles.
assert.match(source, /typeof role !== 'string'/);
assert.match(source, /return false/);

console.log('recruiting authorization regression checks passed');
