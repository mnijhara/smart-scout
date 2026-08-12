// Hostinger-compatible CommonJS entry point.
// Hostinger is configured to start server.cjs, while the application server
// remains TypeScript/ESM in server.ts. tsx handles the TypeScript runtime.
require('tsx/cjs');
require('./server.ts');
