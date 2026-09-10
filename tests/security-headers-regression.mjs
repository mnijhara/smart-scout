import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('server.ts', 'utf8');

assert.match(source, /X-Content-Type-Options['\"]\s*,\s*['\"]nosniff/, 'production server must prevent MIME sniffing');
assert.match(source, /X-Frame-Options['\"]\s*,\s*['\"]SAMEORIGIN/, 'production server must prevent cross-origin framing');
assert.match(source, /Referrer-Policy['\"]\s*,\s*['\"]strict-origin-when-cross-origin/, 'production server must constrain referrer disclosure');
assert.match(source, /Permissions-Policy['\"]\s*,\s*['\"]camera=\(\), geolocation=\(\), payment=\(self\), microphone=\(\)/, 'production server must disable camera, geolocation and microphone browser capabilities');
assert.match(source, /Strict-Transport-Security['\"]\s*,\s*['\"]max-age=31536000; includeSubDomains/, 'production server must enable HSTS in production');
assert.match(source, /X-DNS-Prefetch-Control['\"]\s*,\s*['\"]off/, 'production server must disable DNS prefetching');
assert.match(source, /X-Permitted-Cross-Domain-Policies['\"]\s*,\s*['\"]none/, 'production server must disable cross-domain policy files');
assert.match(source, /Cache-Control['\"]\s*,\s*['\"]no-store, no-cache, must-revalidate, proxy-revalidate/, 'release and HTML responses must not be served from stale caches');

console.log('Security headers and cache-control contract: OK');
