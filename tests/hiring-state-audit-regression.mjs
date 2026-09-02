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
await saveHiringState('tenant_b', 'job_1', 'decision', { recommendation: 'reject' }, 'candidate_2');

const ownStates = await listHiringStates('tenant_a', 'job_1');
assert.equal(ownStates.length, 2, 'workspace must read only its own hiring states');
assert.equal(ownStates[0].tenantId, 'tenant_a');
assert.equal(ownStates[0].jobId, 'job_1');
assert.equal(ownStates[0].id.startsWith('state_'), true);
assert.equal(first.candidateId, 'candidate_1');

const ownOffers = await listHiringStates('tenant_a', 'job_1', 'offer', 'candidate_1');
assert.equal(ownOffers.length, 1, 'state type and candidate filters must compose');
assert.equal(ownOffers[0].type, 'offer');
assert.equal(ownOffers[0].candidateId, 'candidate_1');

const foreignStates = await listHiringStates('tenant_b', 'job_1');
assert.equal(foreignStates.length, 1);
assert.equal(foreignStates[0].candidateId, 'candidate_2');
assert.equal(foreignStates[0].tenantId, 'tenant_b');

const audit = await listAudit('tenant_a', 'job_1');
const savedEvents = audit.filter(event => event.action.startsWith('hiring_state_') && event.action.endsWith('_saved'));
assert.equal(savedEvents.length, 2, 'every local hiring-state write must create an audit event');
assert.ok(savedEvents.every(event => event.persistence === 'local-fallback'), 'unconfigured audit provider must be explicit');
assert.ok(savedEvents.every(event => event.metadata?.stateType), 'audit must identify the persisted state type');
assert.ok(savedEvents.every(event => event.tenantId === 'tenant_a' && event.workflowId === 'job_1'), 'audit events must preserve tenant/workflow identity');

console.log('Hiring-state persistence, tenant isolation, candidate filtering, and audit regression checks passed.');
