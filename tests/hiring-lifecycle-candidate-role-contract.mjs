import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('components/HiringLifecycleRelease.tsx', 'utf8');

assert.match(source, /type Candidate=\{[^}]*\brole\?:string;/s, 'Candidate must model the optional role field consumed by the lifecycle UI');
assert.match(source, /c\.headline\|\|c\.role\|\|['"]Candidate['"]/s, 'Lifecycle UI must preserve role fallback rendering');

console.log('Hiring lifecycle candidate role contract: OK');
