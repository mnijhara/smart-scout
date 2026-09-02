import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-hiring-state-'));
process.env.SMARTSCOUT_HIRING_STATE_STORE = path.join(dir, 'states.json');
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = path.join(dir, 'control-plane');
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { saveHiringState, listHiringStates } = await import('../services/recruiting/hiringStateStore.ts');
const { listAudit } = await import('../services/recruiting/controlPlane.ts');

const first = await saveHiringState('tenant_a', 'job_1', 'decision', { recommendation: 'hire' }, 'candidate_1');
await saveHiringState('tenant_a', 'job_1', 'offer', { status: 'draft' }, 'candidate_1');
await saveHiringState('tenant_a', 'job_2', 'decision', { recommendation: 'hold' }, 'candidate_3');
await saveHiringState('tenant_b', 'job_1', 'decision', { recommendation: 'reject' }, 'candidate_2');

const ownStates = await listHiringStates('tenant_a', 'job_1');
assert.equal(ownStates.length, 2, 'workspace must read only its own hiring states for the requested workflow');
assert.equal(ownStates[0].tenantId, 'tenant_a');
assert.equal(ownStates[0].jobId, 'job_1');
assert.equal(ownStates[0].id.startsWith('state_'), true);
assert.notEqual(ownStates[0].id, ownStates[1].id, 'each persisted state must have a unique identity');
assert.equal(first.candidateId, 'candidate_1');

const otherWorkflowStates = await listHiringStates('tenant_a', 'job_2');
assert.equal(otherWorkflowStates.length, 1, 'same-tenant reads must not leak state from another workflow');
assert.equal(otherWorkflowStates[0].jobId, 'job_2');
assert.equal(otherWorkflowStates[0].candidateId, 'candidate_3');

const ownOffers = await listHiringStates('tenant_a', 'job_1', 'offer', 'candidate_1');
assert.equal(ownOffers.length, 1, 'state type and candidate filters must compose');
assert.equal(ownOffers[0].type, 'offer');
assert.equal(ownOffers[0].candidateId, 'candidate_1');

const foreignStates = await listHiringStates('tenant_b', 'job_1');
assert.equal(foreignStates.length, 1);
assert.equal(foreignStates[0].candidateId, 'candidate_2');
assert.equal(foreignStates[0].tenantId, 'tenant_b');

const ownAudit = await listAudit('tenant_a', 'job_1');
const savedEvents = ownAudit.filter(event => event.action.startsWith('hiring_state_') && event.action.endsWith('_saved'));
assert.equal(savedEvents.length, 2, 'every local hiring-state write must create an audit event');
assert.ok(savedEvents.every(event => event.persistence === 'local-fallback'), 'unconfigured audit provider must be explicit');
assert.ok(savedEvents.every(event => event.metadata?.stateType), 'audit must identify the persisted state type');
assert.ok(savedEvents.every(event => event.tenantId === 'tenant_a' && event.workflowId === 'job_1'), 'audit events must preserve tenant/workflow identity');
assert.ok(savedEvents.every(event => event.candidateId === 'candidate_1'), 'candidate identity must be preserved in hiring-state audit events');
assert.ok(savedEvents.every(event => typeof event.metadata?.stateId === 'string' && event.metadata.stateId.startsWith('state_')), 'audit must link back to the persisted state');

const candidateAudit = await listAudit('tenant_a', 'job_1', 'candidate_1');
assert.equal(candidateAudit.length, 2, 'candidate-scoped audit reads must return only that candidate\'s events');
assert.ok(candidateAudit.every(event => event.candidateId === 'candidate_1'));
assert.equal((await listAudit('tenant_b', 'job_1', 'candidate_1')).length, 0, 'tenant isolation must hold for candidate-scoped audit reads');

console.log('Hiring-state persistence, tenant/workflow isolation, candidate filtering, and audit regression checks passed.');
