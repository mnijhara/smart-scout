import fs from 'node:fs/promises';

const source = await fs.readFile('services/recruiting/hiringStateStore.ts', 'utf8');

if (!/function requirePersistedStateRow\(row:unknown\)/.test(source)) {
  throw new Error('Hiring store must validate the atomic RPC response before publicState conversion');
}

for (const field of ['id','tenant_id','workflow_id','state_type','created_at','updated_at']) {
  const pattern = new RegExp(`value\\[['"]${field}['"]\\]\\s*!==\\s*['"]string['"]`);
  if (!pattern.test(source)) throw new Error(`Atomic RPC response validation must require string ${field}`);
}

if (!/return publicState\(requirePersistedStateRow\(atomic\.data\)\)/.test(source)) {
  throw new Error('Atomic RPC response must be validated before being exposed as a hiring state');
}

if (!/Atomic hiring state RPC returned an invalid state row/.test(source)) {
  throw new Error('Malformed atomic RPC responses must fail closed with a safe error');
}

console.log('Hiring-state atomic audit RPC response regression passed.');
