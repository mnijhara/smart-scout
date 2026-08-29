import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('services/recruiting/controlPlane.ts', 'utf8');

// Every approval/schedule lookup must be scoped by the caller's tenant.
assert.match(source, /x\.id===approvalId&&x\.tenantId===tenant/);
assert.match(source, /x\.tenantId===tenant&&\(!jobId\|\|x\.jobId===jobId\)/);

// Mutating schedule status must resolve the record inside the tenant boundary,
// preventing a valid schedule id from another workspace from being modified.
assert.match(source, /all\.find\(x=>x\.id===scheduleId&&x\.tenantId===tenant\)/);

// Approval decisions, audits and schedules all validate tenant identity instead
// of allowing an omitted tenant to fall through to a global lookup.
assert.match(source, /const tenant=requiredIdentity\(tenantId\|\|'' ,'Tenant identity'\)/);
assert.match(source, /requiredIdentity\(tenantId,'Tenant identity'\)/);

console.log('Control-plane tenant isolation checks passed.');
