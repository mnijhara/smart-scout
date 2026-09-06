import assert from 'node:assert/strict';
import fs from 'node:fs';

const logo = fs.readFileSync('public/brand/smartscout-logo.svg', 'utf8');
const landing = fs.readFileSync('components/LandingPageFinal.tsx', 'utf8');
const releaseLanding = fs.readFileSync('components/LandingPageRelease.tsx', 'utf8');

assert.match(logo, /<title[^>]*>Smart Scout<\/title>/i, 'brand logo must expose an accessible title');
assert.match(logo, /<desc[^>]*>Smart Scout AI-powered recruiting logo<\/desc>/i, 'brand logo must expose an accessible description');
assert.match(landing, /<img[^>]+src=["']\/brand\/smartscout-logo\.svg["'][^>]+alt=["']Smart Scout["']/i, 'final landing logo must have a meaningful alt');
assert.match(releaseLanding, /<img[^>]+src=["']\/brand\/smartscout-logo\.svg["'][^>]+alt=["']Smart Scout["']/i, 'release landing logo must have a meaningful alt');

console.log('Brand accessibility regression passed.');
