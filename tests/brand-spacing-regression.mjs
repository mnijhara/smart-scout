import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const logo = await fs.readFile('public/brand/smartscout-logo.svg', 'utf8');
const smartMatch = logo.match(/<text x="([0-9.]+)" y="([0-9.]+)"[^>]*font-size="([0-9.]+)"[^>]*letter-spacing="(-?[0-9.]+)"[^>]*>Smart<\/text>/);
const scoutMatch = logo.match(/<text x="([0-9.]+)"[^>]*>Scout<\/text>/);

assert(smartMatch && scoutMatch, 'Smart and Scout wordmarks must expose numeric SVG positions and typography');

const smartX = Number(smartMatch[1]);
const fontSize = Number(smartMatch[3]);
const letterSpacing = Number(smartMatch[4]);
const scoutX = Number(scoutMatch[1]);

assert(Number.isFinite(smartX) && Number.isFinite(scoutX), 'Smart and Scout wordmarks must expose numeric SVG x positions');
assert(Number.isFinite(fontSize) && Number.isFinite(letterSpacing), 'Smart wordmark must expose numeric typography metrics');

// Use a conservative text-width estimate so the regression protects against visual
// crowding even if the production font falls back from Inter to a system font.
const estimatedSmartWidth = fontSize * 0.55 * 'Smart'.length + letterSpacing * ('Smart'.length - 1);
const minimumVisualGap = 28;
assert(
  scoutX >= smartX + estimatedSmartWidth + minimumVisualGap,
  `Smart/Scout wordmarks need at least ${minimumVisualGap} SVG units of visual gap; got ${scoutX - smartX - estimatedSmartWidth}`
);

console.log(`Smart Scout logo spacing regression passed: ${scoutX - smartX - estimatedSmartWidth} SVG units estimated visual gap`);
