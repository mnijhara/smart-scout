import { readFile } from 'node:fs/promises';

const api = await readFile(new URL('../services/recruiting/api.ts', import.meta.url), 'utf8');
const auth = await readFile(new URL('../services/recruiting/firebaseAuth.ts', import.meta.url), 'utf8');

const required = [
  ['recruiting API derives tenant from authenticated workspace identity', /function tenantId\(req: any\): string \{\s*return authenticatedTenantId\(req\);/],
  ['recruiting API imports authenticated tenant resolver', /import \{ authenticatedTenantId \} from ['"]\.\/firebaseAuth\.js['"]/],
  ['workspace middleware stamps authenticated identity', /req\.headers\[['"]x-tenant-id['"]\] = identity\.id/],
  ['authenticated resolver ignores client tenant header', /export function authenticatedTenantId\(req:Request\):string\{\s*const identity=/]
];

const failures = required.filter(([, pattern]) => !pattern.test(pattern === required[0][1] || pattern === required[1][1] ? api : auth));
if (failures.length) {
  console.error('Tenant isolation regression checks failed:');
  for (const [name] of failures) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`Tenant isolation regression checks passed (${required.length} controls verified).`);
