import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('services/recruiting/candidateStore.ts', 'utf8');

assert.match(source, /const MAX_IDENTIFIER_LENGTH\s*=\s*256/);
assert.match(source, /function requireTenantId\(tenantId:string\).*tenantId is required.*tenantId is too long/s);
assert.match(source, /function requiredJobId\(jobId:string\).*MAX_IDENTIFIER_LENGTH/s);
assert.match(source, /function requiredCandidateId\(id:string\).*MAX_IDENTIFIER_LENGTH/s);

console.log('candidate tenant/job/id length boundary contract: PASS');
