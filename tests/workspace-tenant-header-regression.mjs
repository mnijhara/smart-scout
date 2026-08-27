import assert from 'node:assert/strict';
import { authenticatedTenantId } from '../services/recruiting/firebaseAuth.ts';

// The HTTP auth middleware must derive tenant identity from the verified workspace
// identity and overwrite any client-supplied x-tenant-id before the recruiting router.
const req = {
  headers: { 'x-tenant-id': 'attacker-controlled-tenant' },
  workspaceIdentity: { kind: 'guest', id: 'guest:verified-workspace' },
};
assert.equal(authenticatedTenantId(req), 'guest:verified-workspace');
assert.notEqual(authenticatedTenantId(req), req.headers['x-tenant-id']);

const firebaseReq = {
  headers: { 'x-tenant-id': 'attacker-controlled-tenant' },
  firebaseUser: { uid: 'verified-firebase-user' },
};
assert.equal(authenticatedTenantId(firebaseReq), 'verified-firebase-user');
assert.notEqual(authenticatedTenantId(firebaseReq), firebaseReq.headers['x-tenant-id']);

console.log('Workspace tenant identity regression passed.');
