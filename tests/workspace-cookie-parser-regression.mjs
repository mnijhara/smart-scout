import assert from 'node:assert/strict';
import { ensureGuestWorkspace } from '../services/recruiting/firebaseAuth.ts';

const req = { headers: { cookie: 'smartscout_workspace=%E0%A4%A' } };
const headers = {};
const res = { setHeader(name, value) { headers[name] = value; } };

const identity = ensureGuestWorkspace(req, res);
assert.equal(identity.kind, 'guest');
assert.match(identity.id, /^guest:[0-9a-f]{64}$/);
assert.match(headers['Set-Cookie'], /^smartscout_workspace=/);

console.log('Malformed workspace cookie safely falls back to a fresh guest session.');
