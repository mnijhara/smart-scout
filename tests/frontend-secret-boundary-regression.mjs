import assert from 'node:assert/strict';
import fs from 'node:fs';

const viteConfig = fs.readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

assert.match(viteConfig, /VITE_GEMINI_API_KEY/, 'frontend config must use an explicitly public Vite key');
assert.match(
  viteConfig,
  /env\.VITE_GEMINI_API_KEY\s*\|\|\s*''/,
  'frontend config must default the public key to an empty string'
);
assert.doesNotMatch(
  viteConfig,
  /env\.GEMINI_API_KEY\s*\)?\s*,/,
  'server-only GEMINI_API_KEY must never be injected directly into the frontend bundle'
);

console.log('Frontend secret-boundary regression passed.');
