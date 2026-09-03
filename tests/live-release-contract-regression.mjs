import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./live-release-contract.mjs', import.meta.url), 'utf8');

assert.match(source, /smart-scout-release/);
assert.match(source, /Live release HTML is missing|Live HTML is missing|Live HTML/);
assert.match(source, /Live release identity disagrees/);
assert.match(source, /Live release is not this GitHub build/);
assert.match(source, /marker !== liveSha/);
assert.match(source, /marker !== expected/);
assert.match(source, /\^\[0-9a-f\]\{40\}\$/i);

console.log('Live release contract regression passed');
