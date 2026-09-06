import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('server.ts', 'utf8');

assert.match(source, /app\.get\('\/release\.json'/, 'production server must expose release.json explicitly');
assert.match(source, /if \(process\.env\.NODE_ENV === 'production'\) \{ app\.get\('\/release\.json'/, 'release.json route must be production-only');
assert.match(source, /res\.type\('application\/json'\)/, 'release.json must declare JSON content type');
assert.match(source, /sendFile\(path\.join\(process\.cwd\(\), 'dist', 'release\.json'\)\)/, 'release.json must resolve to the generated release artifact');

const routeIndex = source.indexOf("app.get('/release.json'");
assert.notEqual(routeIndex, -1, 'release.json route must be present');
const staticIndex = source.indexOf('app.use(express.static(distPath');
assert.notEqual(staticIndex, -1, 'production server must expose the static asset middleware');
assert.ok(routeIndex < staticIndex, 'release.json route must be registered before static assets and SPA fallback');

const routeSource = source.slice(routeIndex, staticIndex);
assert.doesNotMatch(routeSource, /sendFile\([^)]*index\.html/i, 'release.json route must never fall through to index.html');
assert.doesNotMatch(routeSource, /app\.get\('\*all'/, 'release.json route must not be shadowed by the SPA fallback');

console.log('Release JSON route contract: OK');
