const { createRequire } = require('module');

// Hostinger runs the build step before starting the Node.js app.
// Do NOT run `npm` from the runtime process: Hostinger's runtime does not
// expose the npm executable, which causes spawnSync npm ENOENT.
// The Vite build must therefore be configured as Hostinger's Build command.

require('tsx/cjs');
require('./server.ts');
