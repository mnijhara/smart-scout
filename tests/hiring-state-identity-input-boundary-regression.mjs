import fs from 'node:fs/promises';

const source = await fs.readFile('services/recruiting/hiringStateStore.ts', 'utf8');

if (!/function requireLifecycleIdentity\(tenantId:string,jobId:string,candidateId\?:string\)/.test(source)) {
  throw new Error('Hiring state identity validation function is missing');
}

const fn = source.match(/function requireLifecycleIdentity\(tenantId:string,jobId:string,candidateId\?:string\)\{([\s\S]*?)\n\}/)?.[1] || '';

if (!/typeof tenantId !== 'string' \|\| !tenantId\.trim\(\)/.test(fn) || !/typeof jobId !== 'string' \|\| !jobId\.trim\(\)/.test(fn)) {
  throw new Error('Hiring state identity validation must reject non-string or blank tenant/job identities before trimming');
}

if (!/candidateId !== undefined && \(typeof candidateId !== 'string' \|\| !candidateId\.trim\(\)\)/.test(fn)) {
  throw new Error('Hiring state identity validation must reject non-string or blank candidate IDs when provided');
}

if (!/tenantId\.trim\(\)\.length>MAX_HIRING_STATE_IDENTITY_LENGTH/.test(fn) || !/jobId\.trim\(\)\.length>MAX_HIRING_STATE_IDENTITY_LENGTH/.test(fn)) {
  throw new Error('Hiring state identity validation must retain the 256-character tenant/job bounds');
}

console.log('Hiring-state identity input-boundary regression passed.');
