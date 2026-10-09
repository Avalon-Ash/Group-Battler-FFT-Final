import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.wasm': 'application/wasm',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg'
};

const server = http.createServer((req, res) => {
    // 1. Health check endpoints (Cloud Run / Load Balancer)
    if (req.url === '/_healthz' || req.url === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('OK');
        return;
    }

    // Only allow GET / HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
    }

    try {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        let pathname = decodeURIComponent(parsedUrl.pathname);
        let targetPath = path.resolve(DIST_DIR, '.' + pathname);

        // Security: Prevent path traversal outside dist
        if (!targetPath.startsWith(DIST_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
        }

        // Check if directory -> try index.html
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
            targetPath = path.join(targetPath, 'index.html');
        }

        // SPA Fallback: If file does not exist, serve index.html
        if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
            targetPath = path.join(DIST_DIR, 'index.html');
        }

        if (!fs.existsSync(targetPath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Application build not found. Please run npm run build first.');
            return;
        }

        const ext = path.extname(targetPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const isHtml = ext === '.html';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff'
        });

        if (req.method === 'HEAD') {
            res.end();
            return;
        }

        const stream = fs.createReadStream(targetPath);
        stream.on('error', () => {
            if (!res.headersSent) res.writeHead(500);
            res.end('Internal Server Error');
        });
        stream.pipe(res);
    } catch {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
});

server.listen(PORT, HOST, () => {
    console.log(`Production static server running on http://${HOST}:${PORT}`);
});

// Graceful shutdown on SIGTERM / SIGINT for Cloud Run
const handleShutdown = () => {
    console.log('Received shutdown signal, closing server...');
    server.close(() => {
        console.log('Server closed successfully.');
        process.exit(0);
    });
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
