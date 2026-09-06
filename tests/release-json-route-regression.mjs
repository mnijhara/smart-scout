import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('server.ts', 'utf8');

assert.match(source, /app\.get\('\/release\.json'/, 'production server must expose release.json explicitly');
assert.match(source, /res\.type\('application\/json'\)/, 'release.json must declare JSON content type');
assert.match(source, /sendFile\(path\.join\(process\.cwd\(\), 'dist', 'release\.json'\)\)/, 'release.json must resolve to the generated release artifact');

const routeIndex = source.indexOf("app.get('/release.json'");
assert.notEqual(routeIndex, -1, 'release.json route must be present');
const routeSource = source.slice(routeIndex, routeIndex + 1000);
assert.doesNotMatch(routeSource, /sendFile\([^)]*index\.html/i, 'release.json route must never fall through to index.html');

console.log('Release JSON route contract: OK');
