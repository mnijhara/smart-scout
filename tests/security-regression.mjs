import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
const required = [
  ['request correlation', /x-request-id/],
  ['content-type sniffing protection', /X-Content-Type-Options/],
  ['frame protection', /X-Frame-Options/],
  ['referrer policy', /Referrer-Policy/],
  ['production HSTS', /Strict-Transport-Security/],
  ['API rate limiting', /Too many requests\. Please retry shortly/],
  ['origin enforcement', /Request origin is not allowed/],
  ['workspace authentication', /requireWorkspaceAuth/],
  ['control-plane authentication', /requireFirebaseAuth/],
  ['request body size limit', /express\.json\(\{ limit: ['\"]50mb['\"] \}\)/]
];

const failures = required.filter(([, pattern]) => !pattern.test(server));
if (failures.length) {
  console.error('Security regression checks failed:');
  for (const [name] of failures) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`Security regression checks passed (${required.length} controls verified).`);
