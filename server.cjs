const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const INDEX = path.join(DIST, 'index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  res.end(body);
}

function serveFile(res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, 'Not Found');
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function safeDistPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidate = path.resolve(DIST, `.${decoded}`);
  if (candidate === DIST || candidate.startsWith(`${DIST}${path.sep}`)) return candidate;
  return null;
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname === '/health') {
      return send(res, 200, JSON.stringify({ ok: true, service: 'smartscout' }), 'application/json; charset=utf-8');
    }

    if (pathname.startsWith('/api/')) {
      return send(res, 501, JSON.stringify({ error: 'API endpoint not configured on this deployment' }), 'application/json; charset=utf-8');
    }

    const filePath = safeDistPath(pathname);
    if (filePath && pathname !== '/') {
      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return serveFile(res, filePath);
      } catch (_) {}
    }

    if (fs.existsSync(INDEX)) return serveFile(res, INDEX);
    return send(res, 503, 'Smart Scout frontend build is not available yet.');
  } catch (err) {
    console.error('Request error:', err);
    send(res, 500, 'Internal Server Error');
  }
});

server.on('error', (err) => {
  console.error('Smart Scout server error:', err);
  process.exitCode = 1;
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Smart Scout server listening on 0.0.0.0:${PORT}`);
  console.log(`Frontend build: ${INDEX}`);
  console.log(`Frontend build exists: ${fs.existsSync(INDEX)}`);
});
