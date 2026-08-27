import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
const api = await readFile(new URL('../services/recruiting/api.ts', import.meta.url), 'utf8');

const requiredServerContracts = [
  ['x-powered-by disabled', /app\.disable\('x-powered-by'\)/],
  ['request id propagation', /x-request-id/],
  ['content type sniffing protection', /X-Content-Type-Options/],
  ['frame protection', /X-Frame-Options/],
  ['strict referrer policy', /Referrer-Policy/],
  ['production HSTS', /Strict-Transport-Security/],
  ['API rate limiter', /rateBuckets/],
  ['API 429 response', /status\(429\)/],
  ['same-origin mutation guard', /Request origin is not allowed/],
  ['workspace auth on recruiting routes', /app\.use\('\/api\/recruiting', requireWorkspaceAuth/],
  ['firebase auth on control plane', /app\.use\('\/api\/control-plane', requireFirebaseAuth/],
  ['generic internal error response', /Internal server error/],
];

for (const [name, pattern] of requiredServerContracts) {
  if (!pattern.test(server)) throw new Error(`Security contract missing: ${name}`);
}

const requiredApiContracts = [
  ['workspace identity required for AI credentials', /Workspace identity is missing/],
  ['AI provider allowlist', /\['gemini', 'openai', 'anthropic'\]/],
  ['JD approval gate before sourcing', /requireApproval\(req, jobId, 'jd_approval'\)/],
  ['completed interview gate before decision', /Complete the candidate interview before creating a hiring decision/],
  ['decision approval before compensation', /requireApproval\(req, jobId, 'decision'\)/],
  ['compensation approval before offer', /requireApproval\(req, jobId, 'compensation'\)/],
  ['offer approval before sending', /requireApproval\(req, jobId, 'offer'\)/],
];

for (const [name, pattern] of requiredApiContracts) {
  if (!pattern.test(api)) throw new Error(`Recruiting security/lifecycle contract missing: ${name}`);
}

console.log(`Security contract regression passed: ${requiredServerContracts.length + requiredApiContracts.length} invariants`);
