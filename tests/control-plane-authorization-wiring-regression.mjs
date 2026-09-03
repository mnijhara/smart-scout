import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');

const requiredBoundaries = [
  ['resolveTenant', /const resolveTenant=\(req:any\)=>requiredIdentity\(tenantId\(req\),'Tenant identity'\)/],
  ['approval decision tenant argument', /decideApproval\(String\(req\.params\.id\),req\.body\?\.status,actor,req\.body\?\.note,tenant\)/],
  ['schedule status tenant argument', /updateSchedule\(String\(req\.params\.id\),req\.body\?\.status,tenant,actor\)/],
  ['audit write tenant argument', /audit\(\{\.\.\.req\.body,tenantId:resolveTenant\(req\)/],
  ['approval creation tenant argument', /requestApproval\(\{\.\.\.req\.body,tenantId:resolveTenant\(req\)\}\)/],
  ['schedule creation tenant argument', /scheduleInterview\(\{\.\.\.req\.body,tenantId:tenant\},actor\)/],
  ['usage write tenant argument', /recordUsage\(\{\.\.\.req\.body,tenantId:resolveTenant\(req\)\}\)/]
];

const failures = requiredBoundaries
  .filter(([, pattern]) => !pattern.test(source))
  .map(([label]) => `${label}: tenant authorization boundary is missing`);

if (failures.length) {
  console.error('Control-plane authorization regression checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Control-plane authorization wiring regression checks passed.');
