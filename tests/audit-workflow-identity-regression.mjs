import assert from 'node:assert/strict';
import { recordAuditEvent, listAuditEvents, countAuditEvents } from '../services/recruiting/auditStore.ts';

for (const workflowId of ['', '   ']) {
  await assert.rejects(
    () => recordAuditEvent({ tenantId: 'tenant_regression', workflowId, eventType: 'workflow_test' }),
    /workflowId is required/
  );
  await assert.rejects(
    () => listAuditEvents('tenant_regression', workflowId),
    /workflowId is required/
  );
  await assert.rejects(
    () => countAuditEvents('tenant_regression', workflowId),
    /workflowId is required/
  );
}

const unconfigured = await recordAuditEvent({
  tenantId: 'tenant_regression',
  workflowId: 'job_workflow_regression',
  eventType: 'workflow_test',
});
assert.equal(unconfigured.persisted, false);

console.log('audit workflow identity regression passed');
