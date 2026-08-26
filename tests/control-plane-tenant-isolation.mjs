import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('services/recruiting/controlPlane.ts', 'utf8');

// Every approval/schedule lookup must be scoped by the caller's tenant.
assert.match(source, /x\.id===id&&x\.tenantId===tenantId/);
assert.match(source, /x\.tenantId===tenantId&&\(!jobId\|\|x\.jobId===jobId\)/);

// Mutating schedule status must resolve the record inside the tenant boundary,
// preventing a valid schedule id from another workspace from being modified.
assert.match(source, /all\.find\(x=>x\.id===id&&x\.tenantId===tenantId\)/);

// Approval decisions must require an explicit tenant identity rather than
// accepting an omitted tenant and falling back to a global lookup.
assert.match(source, /if\(!tenantId\)throw new Error\('Tenant identity is required'\)/);

console.log('Control-plane tenant isolation checks passed.');
