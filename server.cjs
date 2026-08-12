// Hostinger-compatible CommonJS entry point.
// Hostinger starts this file with Node. Load tsx's CommonJS runtime first,
// then start the existing TypeScript/ESM application server.
require('tsx/cjs');

require('./server.ts');
