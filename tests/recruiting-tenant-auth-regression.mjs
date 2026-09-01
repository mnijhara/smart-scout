import assert from 'node:assert/strict';

process.env.SMARTSCOUT_SESSION_SECRET = 'test-only-session-secret';

const { authenticatedTenantId } = await import('../services/recruiting/firebaseAuth.ts');

const verifiedRequest = {
  headers: { 'x-tenant-id': 'attacker-supplied-tenant' },
  firebaseUser: { uid: 'verified-user-123' },
};
assert.equal(authenticatedTenantId(verifiedRequest), 'verified-user-123');

const workspaceRequest = {
  headers: { 'x-tenant-id': 'attacker-supplied-tenant' },
  workspaceIdentity: { kind: 'guest', id: 'guest:workspace-456' },
};
assert.equal(authenticatedTenantId(workspaceRequest), 'guest:workspace-456');

assert.throws(
  () => authenticatedTenantId({ headers: { 'x-tenant-id': 'attacker-supplied-tenant' } }),
  /Workspace identity is missing/,
);

console.log('recruiting tenant auth regression: PASS');
