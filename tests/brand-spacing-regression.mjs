import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const logo = await fs.readFile('public/brand/smartscout-logo.svg', 'utf8');
const smartX = Number(logo.match(/<text x="([0-9.]+)"[^>]*>Smart<\/text>/)?.[1]);
const scoutX = Number(logo.match(/<text x="([0-9.]+)"[^>]*>Scout<\/text>/)?.[1]);

assert(Number.isFinite(smartX) && Number.isFinite(scoutX), 'Smart and Scout wordmarks must expose numeric SVG x positions');
assert(scoutX >= smartX + 240, `Smart/Scout wordmark spacing must be at least 240 SVG units; got ${scoutX - smartX}`);

console.log(`Smart Scout logo spacing regression passed: ${scoutX - smartX} SVG units`);
