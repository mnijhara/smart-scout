import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const logo = await fs.readFile('public/brand/smartscout-logo.svg', 'utf8');
const smartMatch = logo.match(/<text x="([0-9.]+)" y="([0-9.]+)"[^>]*font-size="([0-9.]+)"[^>]*font-weight="([0-9]+)"[^>]*letter-spacing="(-?[0-9.]+)"[^>]*>Smart<\/text>/);
const scoutMatch = logo.match(/<text x="([0-9.]+)" y="([0-9.]+)"[^>]*font-size="([0-9.]+)"[^>]*font-weight="([0-9]+)"[^>]*letter-spacing="(-?[0-9.]+)"[^>]*>Scout<\/text>/);

assert(smartMatch && scoutMatch, 'Smart and Scout wordmarks must expose numeric positions and typography');

const smartX = Number(smartMatch[1]);
const smartY = Number(smartMatch[2]);
const fontSize = Number(smartMatch[3]);
const smartWeight = Number(smartMatch[4]);
const letterSpacing = Number(smartMatch[5]);
const scoutX = Number(scoutMatch[1]);
const scoutY = Number(scoutMatch[2]);
const scoutFontSize = Number(scoutMatch[3]);
const scoutWeight = Number(scoutMatch[4]);
const scoutLetterSpacing = Number(scoutMatch[5]);

assert(Number.isFinite(smartX) && Number.isFinite(scoutX), 'Wordmarks must expose numeric SVG x positions');
assert(Number.isFinite(smartY) && Number.isFinite(scoutY), 'Wordmarks must expose numeric SVG y positions');
assert(Number.isFinite(fontSize) && Number.isFinite(letterSpacing), 'Smart wordmark must expose numeric typography metrics');
assert(Number.isFinite(scoutFontSize) && Number.isFinite(scoutLetterSpacing), 'Scout wordmark must expose numeric typography metrics');
assert(smartY === scoutY, 'Smart and Scout wordmarks must share the same baseline');
assert(fontSize === scoutFontSize, 'Smart and Scout wordmarks must share the same font size');
assert(smartWeight === scoutWeight, 'Smart and Scout wordmarks must share the same font weight');
assert(letterSpacing === scoutLetterSpacing, 'Smart and Scout wordmarks must share the same letter spacing');

// Use a conservative text-width estimate so the regression protects against visual
// crowding even if the production font falls back from Inter to a system font.
const estimatedSmartWidth = fontSize * 0.55 * 'Smart'.length + letterSpacing * ('Smart'.length - 1);
const minimumVisualGap = 28;
assert(
  scoutX >= smartX + estimatedSmartWidth + minimumVisualGap,
  `Smart/Scout wordmarks need at least ${minimumVisualGap} SVG units of visual gap; got ${scoutX - smartX - estimatedSmartWidth}`
);

console.log(`Smart Scout logo spacing regression passed: ${scoutX - smartX - estimatedSmartWidth} SVG units estimated visual gap`);
