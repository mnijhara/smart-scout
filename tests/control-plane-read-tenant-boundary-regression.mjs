import fs from 'node:fs';

const source = fs.readFileSync(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');

function requirePattern(pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

// Read endpoints must derive the tenant from the authenticated request context.
// They must never accept a caller-supplied tenant id as an authorization boundary.
requirePattern(/const resolveTenant=\(req\)=>requiredIdentity\(tenantId\(req\),'Tenant identity'\)/,
  'Control-plane reads must resolve tenant identity from the authenticated request');
requirePattern(/r\.get\('\/approvals',[\s\S]*?listApprovals\(resolveTenant\(req\)/,
  'Approval reads must use the resolved authenticated tenant');
requirePattern(/r\.get\('\/audit',[\s\S]*?listAudit\(resolveTenant\(req\)/,
  'Audit reads must use the resolved authenticated tenant');
requirePattern(/r\.get\('\/schedules',[\s\S]*?listSchedules\(resolveTenant\(req\)/,
  'Schedule reads must use the resolved authenticated tenant');
requirePattern(/r\.get\('\/usage',[\s\S]*?usageSummary\(resolveTenant\(req\)/,
  'Usage reads must use the resolved authenticated tenant');

for (const route of ['/approvals', '/audit', '/schedules', '/usage']) {
  const routeBlock = source.slice(source.indexOf(`r.get('${route}'`), source.indexOf(`r.get('${route}'`) + 700);
  if (/tenantId\s*[:=]/.test(routeBlock) || /req\.query\.tenantId/.test(routeBlock)) {
    throw new Error(`${route} must not accept tenantId from query/body as an authorization boundary`);
  }
}

console.log('Control-plane read tenant-boundary regression passed');
