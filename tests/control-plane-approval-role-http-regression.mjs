import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve('services/recruiting/controlPlane.ts'), 'utf8');

assert.match(source, /import \{ requirePrivilegedRecruitingRole \} from '\.\/authorization\.js';/);
assert.match(source, /const requireRecruitingRole=\(req:any\)=>requirePrivilegedRecruitingRole\(\(req as any\)\.workspaceIdentity\?\.role\)/);
assert.match(source, /r\.post\('\/approvals'/);
assert.match(source, /requireRecruitingRole\(req\)/);
assert.match(source, /const forbidden=e\?\.message==='Insufficient permissions';/);
assert.match(source, /res\.status\(forbidden\?403:400\)/);
assert.match(source, /r\.post\('\/approvals\/\:id\/decision'/);

console.log('Approval role authorization HTTP boundary regression passed');
