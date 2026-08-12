const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const indexFile = path.join(root, 'dist', 'index.html');

// Hostinger's Node.js Web App runs the configured entry file directly.
// Keep the real application server in server.ts, but make this entry point
// production-safe for Hostinger: ensure the Vite frontend exists first.
if (!fs.existsSync(indexFile)) {
  console.log('Frontend build not found; running npm run build...');
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
}

if (!fs.existsSync(indexFile)) {
  throw new Error(`Frontend build failed: ${indexFile} was not created.`);
}

// tsx officially supports registering TypeScript for CommonJS entry points.
// This lets Hostinger keep server.cjs as its entry file while the actual
// application remains server.ts and retains all existing API routes.
require('tsx/cjs');
require('./server.ts');
