import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.mjs': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  // Cloud Run health check / ping
  if (req.url === '/_healthz' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  const rawUrl = req.url || '/';
  const urlPath = rawUrl.split('?')[0];
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(distDir, safePath);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        // Fallback to index.html for client-side SPA routing
        const spaIndex = path.join(distDir, 'index.html');
        fs.readFile(spaIndex, (spaErr, spaContent) => {
          if (spaErr) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server Error: Build output (dist/index.html) not found.');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
          res.end(spaContent);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        ...(ext === '.html' ? { 'Cache-Control': 'no-cache' } : { 'Cache-Control': 'public, max-age=31536000, immutable' }),
      });
      res.end(content);
    });
  });
});

server.listen(port, host, () => {
  console.log(`[TACTICAL.OS] Production server listening on http://${host}:${port}`);
});

// Graceful container termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, closing server...');
  server.close(() => {
    process.exit(0);
  });
});
