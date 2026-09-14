/**
 * scripts/vendor-aframe.mjs
 * Runs automatically before `npm run build` (see the "prebuild" script).
 *
 * Saves a copy of A-Frame into public/vendor/ so the deployed site can serve
 * it from its own domain. index.html tries the CDN first and falls back to
 * this copy, which keeps the game working on networks that block aframe.io -
 * exactly the kind of locked-down network warehouse staff tend to be on.
 *
 * This script NEVER fails the build. If the download does not work, the page
 * simply uses the CDN.
 */

import fs from 'node:fs';
import path from 'node:path';

const SOURCE = 'https://aframe.io/releases/1.7.0/aframe.min.js';
const OUT_DIR = path.join('public', 'vendor');
const OUT_FILE = path.join(OUT_DIR, 'aframe.min.js');
const MIN_BYTES = 200_000; // a truncated download or an error page is useless

function ok(msg) { console.log('[vendor-aframe] ' + msg); }
function warn(msg) { console.warn('[vendor-aframe] ' + msg); }

if (fs.existsSync(OUT_FILE) && fs.statSync(OUT_FILE).size > MIN_BYTES) {
  ok('already present, skipping download.');
} else {
  try {
    const res = await fetch(SOURCE);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length < MIN_BYTES) throw new Error('download too small (' + bytes.length + ' bytes)');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, bytes);
    ok('saved ' + OUT_FILE + ' (' + Math.round(bytes.length / 1024) + ' KB).');
  } catch (err) {
    warn('could not download A-Frame: ' + err.message);
    warn('the page will load it from the CDN instead - continuing with the build.');
  }
}
