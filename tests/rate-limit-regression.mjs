import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');

const failures = [];
if (!/if \(req\.path\.startsWith\('\/api\/'\)\)/.test(server)) failures.push('rate limiting must apply to API routes');
if (!/bucket\.count >= 180/.test(server)) failures.push('API rate limit threshold must remain 180 requests per minute');
if (!/resetAt: now \+ 60_000/.test(server)) failures.push('rate-limit buckets must reset after one minute');
if (!/res\.status\(429\)\.json\(\{ error: 'Too many requests\. Please retry shortly\.' \}\)/.test(server)) failures.push('rate limit must return HTTP 429 with the stable error contract');
if (!/if \(rateBuckets\.size > 5000\)/.test(server)) failures.push('rate-limit bucket map must be bounded and cleaned up');

if (failures.length) {
  console.error('Rate-limit regression checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Rate-limit regression checks passed (API scope, threshold, reset, 429 contract, bounded buckets).');
