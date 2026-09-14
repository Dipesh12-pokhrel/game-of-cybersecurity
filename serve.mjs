/**
 * serve.mjs
 * A zero-dependency static file server, used as a safety net.
 *
 * The game is written as plain ES modules with a plain <link> stylesheet, so
 * it needs no build step at all - any static server can run it. If `npm
 * install` cannot complete (offline, a proxy, a blocked GitHub tarball), the
 * launcher falls back to this file and the game still works:
 *
 *     node serve.mjs
 *
 * `npm run dev` (Vite) is still the nicer option when it is available,
 * because it adds hot reloading.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const START_PORT = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

/** Resolve a URL path to a file, checking the project root then public/. */
function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const rel = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');

  for (const base of [ROOT, PUBLIC_DIR]) {
    const candidate = path.resolve(base, rel);
    // Never serve anything outside the project folder.
    if (!candidate.startsWith(base)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const server = http.createServer((req, res) => {
  const file = resolveFile(req.url || '/');
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 - not found: ' + req.url);
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(file).pipe(res);
});

/** Open the default browser (best effort - never fatal). */
function openBrowser(url) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
    : process.platform === 'darwin' ? ['open', [url]]
      : ['xdg-open', [url]];
  try {
    spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).unref();
  } catch (err) {
    /* the address is printed below either way */
  }
}

function listen(port, attemptsLeft = 10) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      listen(port + 1, attemptsLeft - 1);
    } else {
      console.error('Could not start the server:', err.message);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    const url = `http://localhost:${port}/`;
    console.log('');
    console.log('  Cyber Defence: Himalayan Data Vault is running at');
    console.log('    ' + url);
    console.log('');
    console.log('  Press Ctrl+C to stop.');
    console.log('');
    if (process.env.NO_OPEN !== '1') openBrowser(url);
  });
}

listen(START_PORT);
