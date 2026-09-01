import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartscout-candidate-audit-'));
process.env.SMARTSCOUT_CANDIDATE_STORE = path.join(dir, 'candidates.json');
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = path.join(dir, 'control-plane');
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { saveCandidates, listCandidates, updateCandidateScore, updateCandidateStatus } = await import('../services/recruiting/candidateStore.ts');

const tenantId = 'tenant-audit-regression';
const otherTenantId = 'tenant-audit-regression-other';
const jobId = 'job_audit-regression';
const [candidate] = await saveCandidates(tenantId, jobId, [{ name: 'Candidate', status: 'discovered' }]);
assert.ok(candidate?.id);

await updateCandidateScore(tenantId, candidate.id, { score: 88 });
const unchangedScore = await updateCandidateScore(tenantId, candidate.id, { score: 88 });
assert.deepEqual(unchangedScore?.score, { score: 88 });

const updated = await updateCandidateStatus(tenantId, candidate.id, 'screening');
assert.equal(updated?.candidate?.status, 'screening');
const unchanged = await updateCandidateStatus(tenantId, candidate.id, 'screening');
assert.equal(unchanged?.candidate?.status, 'screening');

// A candidate identifier must never cross a tenant boundary in either reads or writes.
assert.deepEqual(await listCandidates(otherTenantId, jobId), []);
assert.equal(await updateCandidateStatus(otherTenantId, candidate.id, 'hired'), null);
assert.equal(await updateCandidateScore(otherTenantId, candidate.id, { score: 100 }), null);
const tenantScoped = await listCandidates(tenantId, jobId);
assert.equal(tenantScoped[0]?.candidate?.status, 'screening');
assert.deepEqual(tenantScoped[0]?.score, { score: 88 });

const auditPath = path.join(dir, 'control-plane', 'audit.json');
const events = JSON.parse(await fs.readFile(auditPath, 'utf8'));
const lifecycle = events.filter(event => event.tenantId === tenantId && event.jobId === jobId && event.candidateId === candidate.id);
assert.deepEqual(lifecycle.map(event => event.action).sort(), ['candidate_score_updated', 'candidate_status_updated', 'candidates_persisted']);
assert.equal(lifecycle.filter(event => event.action === 'candidates_persisted')[0].metadata.count, 1);
const scoreEvents = lifecycle.filter(event => event.action === 'candidate_score_updated');
assert.equal(scoreEvents.length, 1);
assert.equal(scoreEvents[0].metadata.previousScore, null);
assert.deepEqual(scoreEvents[0].metadata.nextScore, { score: 88 });
const statusEvents = lifecycle.filter(event => event.action === 'candidate_status_updated');
assert.equal(statusEvents.length, 1);
assert.equal(statusEvents[0].metadata.previousStatus, 'discovered');
assert.equal(statusEvents[0].metadata.nextStatus, 'screening');
assert.equal(statusEvents[0].metadata.status, undefined);

await assert.rejects(() => updateCandidateStatus(tenantId, candidate.id, '   '), /status is required/);

console.log('candidate persistence audit regression: PASS');
