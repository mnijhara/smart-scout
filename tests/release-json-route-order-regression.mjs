import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

const releaseRoute = "app.get('/release.json'";
const staticFallback = "app.get('*all'";
const releaseIndex = source.indexOf(releaseRoute);
const fallbackIndex = source.indexOf(staticFallback);

assert.ok(releaseIndex >= 0, 'Production server must register /release.json explicitly');
assert.ok(fallbackIndex >= 0, 'Production server must retain the SPA fallback');
assert.ok(releaseIndex < fallbackIndex, '/release.json must be registered before the SPA fallback');
assert.match(source.slice(releaseIndex, fallbackIndex), /res\.type\(['"]application\/json['"]\)/, '/release.json must declare application/json');
assert.match(source.slice(releaseIndex, fallbackIndex), /sendFile\(path\.join\(process\.cwd\(\), ['"]dist['"], ['"]release\.json['"]\)\)/, '/release.json must serve the generated release artifact');
assert.match(source.slice(releaseIndex, fallbackIndex), /Cache-Control.*no-store/, '/release.json must disable caching so release identity cannot remain stale');

console.log('Release JSON route order regression passed');
