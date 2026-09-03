import fs from 'node:fs';

const source = fs.readFileSync(new URL('../services/recruiting/controlPlane.ts', import.meta.url), 'utf8');

if (!source.includes("r.post('/audit',async(req,res)=>")) {
  throw new Error('Audit mutation route is missing');
}

const auditRoute = source.match(/r\.post\('\/audit',[\s\S]*?\n/)[0];
if (!auditRoute.includes('requireRecruitingRole(req)')) {
  throw new Error('Audit mutation route must enforce the privileged recruiting role');
}
if (!auditRoute.includes('actor:actorFromRequest(req)')) {
  throw new Error('Audit mutation route must derive the audit actor from authenticated workspace identity');
}

console.log('control-plane audit role HTTP regression passed');
