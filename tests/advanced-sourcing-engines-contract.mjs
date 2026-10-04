import assert from 'node:assert/strict';
import fs from 'node:fs';

// Verify crawlee intelligence service file exists and exports crawlMarketIntelligence
const crawleeFile = fs.readFileSync('services/recruiting/crawleeIntelligence.ts', 'utf8');
assert.match(crawleeFile, /export async function crawlMarketIntelligence/, 'crawleeIntelligence must export crawlMarketIntelligence');
assert.match(crawleeFile, /PlaywrightCrawler/, 'crawleeIntelligence must utilize Crawlee PlaywrightCrawler');

// Verify browser-use agent service file exists and exports runBrowserUseAgent
const browserUseFile = fs.readFileSync('services/recruiting/browserUseAgent.ts', 'utf8');
assert.match(browserUseFile, /export async function runBrowserUseAgent/, 'browserUseAgent must export runBrowserUseAgent');
assert.match(browserUseFile, /source:\s*['"]browser-use:autonomous-agent['"]/, 'browserUseAgent must attribute candidate source to autonomous agent');

// Verify routes exist in browserSourceRoutes.ts
const routesFile = fs.readFileSync('services/recruiting/browserSourceRoutes.ts', 'utf8');
assert.match(routesFile, /\/browser-use\/scout/, 'browserSourceRoutes must expose /browser-use/scout');
assert.match(routesFile, /\/crawlee\/market-benchmark/, 'browserSourceRoutes must expose /crawlee/market-benchmark');

console.log('ADVANCED_SOURCING_ENGINES_CONTRACT_OK');
