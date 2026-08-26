import fs from 'node:fs/promises';

const store = await fs.readFile('services/recruiting/hiringStateStore.ts', 'utf8');

const saveStateBlocks = [...store.matchAll(/export async function saveHiringState[\s\S]*?\n}\nexport async function listHiringStates/g)].map((match) => match[0]);
if (saveStateBlocks.length !== 1) {
  throw new Error('Expected exactly one saveHiringState implementation');
}

const block = saveStateBlocks[0];
const auditCalls = [...block.matchAll(/recordAuditEvent\(\{[\s\S]*?\}\)/g)];
if (auditCalls.length < 2) {
  throw new Error('Both persistent and fallback hiring-state paths must record an audit event');
}

if (/void\s+recordAuditEvent/.test(block)) {
  throw new Error('Hiring lifecycle audit writes must not be fire-and-forget');
}

for (const call of auditCalls) {
  const prefix = block.slice(Math.max(0, call.index - 20), call.index);
  if (!/await\s*$/.test(prefix)) {
    throw new Error('Every hiring lifecycle audit write must be awaited');
  }
}

if (!/if\(process\.env\.NODE_ENV==='production'\)throw new Error\('Persistent hiring state storage is not configured'\)/.test(block)) {
  throw new Error('Production must not silently fall back to file-backed hiring state persistence');
}

console.log('Hiring lifecycle audit durability regression verification passed');
