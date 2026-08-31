import fs from 'node:fs';

const source = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

const required = [
  /const rateBuckets = new Map<string, \{ count: number; resetAt: number \}>\(\)/,
  /req\.path\.startsWith\('\/api\/'\)/,
  /bucket\.count >= 180/,
  /return res\.status\(429\)\.json\(\{ error: 'Too many requests\. Please retry shortly\.' \}\)/,
  /bucket\.resetAt <= now/,
  /rateBuckets\.size > 5000/,
  /value\.resetAt <= now/,
];

for (const pattern of required) {
  if (!pattern.test(source)) throw new Error(`Rate-limit production invariant missing: ${pattern}`);
}

if (!/res\.setHeader\('x-request-id', requestId\)/.test(source)) {
  throw new Error('Rate-limited API requests must retain request correlation IDs');
}

if (!/const retryAfterSeconds = Math\.max\(1, Math\.ceil\(\(bucket\.resetAt - now\) \/ 1000\)\)/.test(source) || !/res\.setHeader\('Retry-After', String\(retryAfterSeconds\)\)/.test(source)) {
  throw new Error('Rate-limited responses must advertise a bounded Retry-After delay');
}

const limiterStart = source.indexOf("req.path.startsWith('/api/')");
const jsonParserStart = source.indexOf("app.use(express.json({ limit: '50mb' }))");
if (limiterStart === -1 || jsonParserStart === -1 || limiterStart > jsonParserStart) {
  throw new Error('API rate limiting must run before the large JSON body parser to bound unauthenticated payload abuse');
}

console.log('rate-limit-production-regression: ok');
