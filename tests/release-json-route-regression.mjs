import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync('server.ts', 'utf8');
assert.match(source, /app\.get\('\/release\.json'/, 'production server must expose release.json explicitly');
assert.match(source, /res\.type\('application\/json'\)/, 'release.json must declare JSON content type');
assert.match(source, /sendFile\(path\.join\(process\.cwd\(\), 'dist', 'release\.json'\)\)/, 'release.json must resolve to the generated release artifact');
console.log('Release JSON route contract: OK');
