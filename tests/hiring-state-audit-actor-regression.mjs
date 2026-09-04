import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartscout-hiring-state-actor-'));
process.env.SMARTSCOUT_HIRING_STATE_STORE = path.join(dir, 'states.json');
process.env.SMARTSCOUT_CONTROL_PLANE_DIR = path.join(dir, 'control-plane');
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { saveHiringState } = await import('../services/recruiting/hiringStateStore.ts');
const { listAudit } = await import('../services/recruiting/controlPlane.ts');

await saveHiringState('tenant_actor', 'job_1', 'decision', { recommendation: 'hire' }, undefined, 'recruiter@example.com');
const events = await listAudit('tenant_actor', 'job_1');
const event = events.find(item => item.action === 'hiring_state_decision_saved');

assert.ok(event, 'hiring-state persistence must emit its lifecycle audit event');
assert.equal(event.actor, 'recruiter@example.com', 'audit must preserve the authenticated lifecycle actor');
assert.notEqual(event.actor, 'hiring-lifecycle', 'production lifecycle audit must not silently use the generic actor when one is supplied');
assert.equal(event.metadata?.stateType, 'decision');

await assert.rejects(
  () => saveHiringState('tenant_actor', 'job_1', 'offer', { status: 'draft' }, undefined, '   '),
  /Hiring state actor is required/,
  'blank lifecycle actors must be rejected before persistence'
);

console.log('Hiring-state authenticated actor propagation and validation regression checks passed.');
