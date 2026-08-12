const { createRequire } = require('module');

process.env.NODE_ENV = 'production';

// Hostinger runs the build step before starting the Node.js app.
// Do NOT run `npm` from the runtime process: Hostinger's runtime does not
// expose the npm executable, which causes spawnSync npm ENOENT.
// The Vite build is generated before startup and is served by server.ts.

require('tsx/cjs');
require('./server.ts');
