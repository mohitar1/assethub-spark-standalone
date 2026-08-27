#!/usr/bin/env node
/**
 * Serves a Vitest HTML report directory over HTTP so the browser can load
 * ES modules (file:// URLs block them due to CORS). Opens the browser
 * automatically, then shuts down after 5 minutes of inactivity.
 *
 * Usage: node tests/serve-report.js <report-dir>
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: node tests/serve-report.js <report-dir>');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.gz': 'application/gzip',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
let idleTimer;

function resetIdle(server) {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    console.log('\nIdle timeout — shutting down report server.');
    server.close(() => process.exit(0));
  }, IDLE_TIMEOUT_MS);
}

const server = createServer(async (req, res) => {
  resetIdle(server);
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = join(dir, urlPath);

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');
    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(0, () => {
  const { port } = server.address();
  const url = `http://localhost:${port}`;
  console.log(`\n  Report server running at ${url}`);
  console.log('  Press Ctrl+C to stop (auto-stops after 5 min idle)\n');
  try { execSync(`open "${url}"`); } catch { /* non-macOS */ }
  resetIdle(server);
});
