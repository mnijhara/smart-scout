import assert from 'node:assert/strict';
import { authenticatedTenantId, requireWorkspaceAuth } from '../services/recruiting/firebaseAuth.ts';

function makeReq(headers = {}) {
  return {
    headers: { ...headers },
    header(name) {
      const key = name.toLowerCase();
      return this.headers[key] ?? this.headers[name] ?? '';
    },
  };
}

function makeRes() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status() { throw new Error('Unexpected authentication failure'); },
    json(body) { throw new Error(JSON.stringify(body)); },
  };
}

const req = makeReq({ 'x-tenant-id': 'attacker-tenant' });
const res = makeRes();
let nextCalled = false;
await requireWorkspaceAuth(req, res, () => { nextCalled = true; });
assert.equal(nextCalled, true);
assert.match(req.workspaceIdentity.id, /^guest:/);
assert.equal(req.headers['x-tenant-id'], req.workspaceIdentity.id);
assert.notEqual(req.headers['x-tenant-id'], 'attacker-tenant');
assert.equal(authenticatedTenantId(req), req.workspaceIdentity.id);

console.log('Workspace identity authority regression passed.');
