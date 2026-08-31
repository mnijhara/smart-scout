import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');

assert.match(
  source,
  /function auditDatabaseConfigured\(\)\{return Boolean\(process\.env\.SUPABASE_URL&&process\.env\.SUPABASE_SERVICE_ROLE_KEY\);\}/,
  'control plane must have an explicit Supabase audit configuration check',
);
assert.match(
  source,
  /if\(auditDatabaseConfigured\(\)\)\{const events=await listAuditEvents\(tenant,normalizedJobId,normalizedCandidateId\);return events\.map\(mapDatabaseAuditEvent\);\}/,
  'configured audit reads must use the durable audit store with tenant/job/candidate scope',
);
assert.match(
  source,
  /if\(auditDatabaseConfigured\(\)\)return countAuditEvents\(tenant,normalizedJobId,normalizedCandidateId\);/,
  'configured audit counts must use the durable audit store with tenant/job/candidate scope',
);
assert.match(
  source,
  /return\{configured:false,count:\(await read<AuditEvent>\(files\.audit\)\)\.filter\(x=>x\.tenantId===tenant&&\(!normalizedJobId\|\|x\.jobId===normalizedJobId\)&&\(!normalizedCandidateId\|\|x\.candidateId===normalizedCandidateId\)\)\.length\};/,
  'unconfigured audit counts must retain the local fallback with tenant/job/candidate scope',
);
assert.doesNotMatch(
  source,
  /catch\([^)]*\)\{[^}]*read<AuditEvent>\(files\.audit\)/,
  'database read failures must not silently fall back to local data and create split-brain audit history',
);

console.log('Control-plane audit storage selection regression passed');
