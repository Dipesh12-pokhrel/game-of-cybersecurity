/**
 * textures.js
 * Every surface in the game is drawn at runtime on a <canvas>, so the project
 * ships with zero binary assets and zero licensing questions.
 *
 * To use real photographs or 360 images instead, see "Replacing the assets"
 * in README.md - each function below has a matching swap-in point.
 */

const cache = new Map();

/** Creates (and caches) a canvas texture. */
function makeCanvas(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  cache.set(key, c);
  return c;
}

/** Small deterministic pseudo-random so textures look the same every run. */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* ------------------------------------------------------------------ */
/* Floors, walls, metal                                                */
/* ------------------------------------------------------------------ */

/** Polished concrete warehouse floor with subtle speckle and joint lines. */
export function concreteFloor() {
  return makeCanvas('concrete', 512, 512, (g, w, h) => {
    g.fillStyle = '#2b323d';
    g.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 9000; i++) {
      const v = r();
      g.fillStyle = `rgba(${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${0.02 + v * 0.05})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    // expansion joints
    g.strokeStyle = 'rgba(10,14,20,0.65)';
    g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(i * 256, 0); g.lineTo(i * 256, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * 256); g.lineTo(w, i * 256); g.stroke();
    }
  });
}

/** Painted steel wall panelling with rivets. */
export function steelPanel(tint = '#3a465c') {
  return makeCanvas('steel' + tint, 512, 512, (g, w, h) => {
    g.fillStyle = tint;
    g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0.09)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.28)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 2;
    for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    // rivets
    g.fillStyle = 'rgba(255,255,255,0.16)';
    for (let x = 16; x < w; x += 128) {
      for (let y = 16; y < h; y += 128) {
        g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
      }
    }
  });
}

/** Yellow/black hazard stripes for floor markings and the loading bay edge. */
export function hazardStripes() {
  return makeCanvas('hazard', 256, 64, (g, w, h) => {
    g.fillStyle = '#14181f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e0a52a';
    for (let i = -h; i < w; i += 48) {
      g.beginPath();
      g.moveTo(i, h); g.lineTo(i + 24, h); g.lineTo(i + 24 + h, 0); g.lineTo(i + h, 0);
      g.closePath(); g.fill();
    }
  });
}

/** Ceiling with recessed lighting strips. */
export function ceilingPanel() {
  return makeCanvas('ceiling', 256, 256, (g, w, h) => {
    g.fillStyle = '#1a2130'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke();
    }
  });
}

/** Server rack face: vents plus a column of status LEDs. */
export function rackFace(seed = 1) {
  return makeCanvas('rack' + seed, 256, 512, (g, w, h) => {
    g.fillStyle = '#121821'; g.fillRect(0, 0, w, h);
    const r = rng(seed * 31 + 5);
    for (let y = 8; y < h - 8; y += 26) {
      g.fillStyle = '#0a0e15';
      g.fillRect(10, y, w - 20, 18);
      g.fillStyle = 'rgba(255,255,255,0.05)';
      g.fillRect(10, y, w - 20, 2);
      // vent slots
      g.fillStyle = 'rgba(0,0,0,0.6)';
      for (let x = 22; x < w - 60; x += 7) g.fillRect(x, y + 5, 3, 9);
      // LEDs
      const on = r();
      g.fillStyle = on > 0.75 ? '#ffb020' : on > 0.35 ? '#3ce88f' : '#1d4b6b';
      g.beginPath(); g.arc(w - 34, y + 9, 3.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = r() > 0.5 ? '#55e9ff' : '#123044';
      g.beginPath(); g.arc(w - 22, y + 9, 3.2, 0, Math.PI * 2); g.fill();
    }
  });
}

/** Warehouse shelving upright / pallet rack beam texture. */
export function rackBeam() {
  return makeCanvas('beam', 128, 128, (g, w, h) => {
    g.fillStyle = '#c96a1c'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = 0; y < h; y += 22) g.fillRect(0, y, w, 3);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, w, 6);
  });
}

/** Cardboard pallet box. */
export function cardboard(seed = 2) {
  return makeCanvas('box' + seed, 256, 256, (g, w, h) => {
    const r = rng(seed * 17 + 3);
    g.fillStyle = '#9c7346'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.07})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    g.strokeStyle = 'rgba(60,40,20,0.55)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    // fictional shipping label
    g.fillStyle = '#efe6d4'; g.fillRect(30, 62, 120, 74);
    g.fillStyle = '#2b323d'; g.font = 'bold 13px sans-serif';
    g.fillText('HIMALAYAN', 38, 84);
    g.fillText('DATA VAULT', 38, 100);
    g.font = '11px sans-serif';
    g.fillText('BATCH 44' + Math.floor(r() * 90 + 10), 38, 118);
    // barcode
    g.fillStyle = '#1a1a1a';
    for (let x = 0; x < 100; x += 4) g.fillRect(38 + x, 122, 1 + r() * 2, 10);
  });
}

/* ------------------------------------------------------------------ */
/* Screens                                                             */
/* ------------------------------------------------------------------ */

/**
 * Animated screen canvas.
 * Returns { canvas, update(t) } - the world builder feeds these to a
 * THREE.CanvasTexture that is refreshed each frame.
 */
export function makeScreen(kind, opts = {}) {
  const c = document.createElement('canvas');
  c.width = opts.w || 512;
  c.height = opts.h || 320;
  const g = c.getContext('2d');
  const r = rng(opts.seed || 11);
  const rain = Array.from({ length: 46 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, s: 30 + Math.random() * 90 }));

  function frame(t, alertLevel) {
    const w = c.width, h = c.height;
    g.clearRect(0, 0, w, h);

    if (kind === 'code') {
      g.fillStyle = '#040a12'; g.fillRect(0, 0, w, h);
      g.font = '13px monospace';
      rain.forEach((d, i) => {
        d.y += d.s * 0.016;
        if (d.y > h + 30) { d.y = -20; d.x = Math.random() * w; }
        for (let k = 0; k < 7; k++) {
          const alpha = (1 - k / 7) * 0.85;
          g.fillStyle = `rgba(85,233,255,${alpha})`;
          g.fillText(String.fromCharCode(0x30a0 + ((i * 7 + k + Math.floor(t * 3)) % 60)), d.x, d.y - k * 15);
        }
      });
      g.fillStyle = 'rgba(85,233,255,0.85)';
      g.font = 'bold 15px monospace';
      g.fillText('VAULT MONITOR // NODE ' + (opts.seed || 1), 14, 24);
    }

    else if (kind === 'stock') {
      g.fillStyle = '#071223'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#0d1c33'; g.fillRect(0, 0, w, 34);
      g.fillStyle = '#7ef7ff'; g.font = 'bold 15px sans-serif';
      g.fillText('STOCK CONTROL — BAY STATUS', 14, 23);
      for (let i = 0; i < 8; i++) {
        const y = 52 + i * 32;
        g.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'transparent';
        g.fillRect(10, y - 16, w - 20, 28);
        g.fillStyle = '#9cb7d8'; g.font = '13px monospace';
        g.fillText('PALLET HDV-' + (4400 + i * 7), 20, y + 3);
        const pct = (Math.sin(t * 0.6 + i) * 0.5 + 0.5);
        g.fillStyle = '#12304a'; g.fillRect(230, y - 8, 180, 12);
        g.fillStyle = pct > 0.75 ? '#ffb020' : '#3ce88f';
        g.fillRect(230, y - 8, 180 * pct, 12);
        g.fillStyle = '#7b90ad'; g.font = '11px monospace';
        g.fillText(Math.round(pct * 100) + '%', 424, y + 2);
      }
    }

    else if (kind === 'cctv') {
      g.fillStyle = '#0a1118'; g.fillRect(0, 0, w, h);
      // four quadrant "camera feeds" of noise + a moving block
      for (let q = 0; q < 4; q++) {
        const qx = (q % 2) * (w / 2), qy = Math.floor(q / 2) * (h / 2);
        g.save();
        g.beginPath(); g.rect(qx + 4, qy + 4, w / 2 - 8, h / 2 - 8); g.clip();
        g.fillStyle = '#13202c'; g.fillRect(qx + 4, qy + 4, w / 2 - 8, h / 2 - 8);
        for (let i = 0; i < 260; i++) {
          g.fillStyle = `rgba(255,255,255,${r() * 0.07})`;
          g.fillRect(qx + r() * (w / 2), qy + r() * (h / 2), 2, 2);
        }
        g.fillStyle = 'rgba(120,160,190,0.35)';
        const bx = qx + 20 + ((t * 22 + q * 60) % (w / 2 - 70));
        g.fillRect(bx, qy + h / 4, 16, 34);
        g.fillStyle = '#8fb3cc'; g.font = '10px monospace';
        g.fillText('CAM 0' + (q + 1), qx + 12, qy + 20);
        g.fillStyle = '#ff4d5e';
        g.beginPath(); g.arc(qx + w / 2 - 18, qy + 16, 4, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    }

    else if (kind === 'alert') {
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      g.fillStyle = `rgba(${40 + pulse * 60},4,12,1)`; g.fillRect(0, 0, w, h);
      g.strokeStyle = `rgba(255,77,94,${0.4 + pulse * 0.5})`;
      g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#ff6b7a'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
      g.fillText('⚠ SECURITY ALERT', w / 2, h / 2 - 24);
      g.font = '16px monospace'; g.fillStyle = '#ffd3d8';
      g.fillText(opts.line || 'UNAUTHORISED ACCESS ATTEMPT DETECTED', w / 2, h / 2 + 10);
      g.font = '13px monospace'; g.fillStyle = `rgba(255,255,255,${0.35 + pulse * 0.5})`;
      g.fillText('SIMULATION — TRAINING EXERCISE ONLY', w / 2, h / 2 + 44);
      g.textAlign = 'left';
    }

    else if (kind === 'phantom') {
      g.fillStyle = '#12030a'; g.fillRect(0, 0, w, h);
      // scan bars
      for (let y = 0; y < h; y += 4) {
        g.fillStyle = `rgba(255,77,94,${0.03 + 0.03 * Math.sin(t * 6 + y)})`;
        g.fillRect(0, y, w, 2);
      }
      const jitter = Math.sin(t * 20) > 0.92 ? (r() - 0.5) * 10 : 0;
      g.fillStyle = '#ff4d5e'; g.textAlign = 'center';
      g.font = 'bold 26px monospace';
      g.fillText('THE PHANTOM HACKER', w / 2 + jitter, 70);
      g.font = '14px monospace'; g.fillStyle = '#ffb9c1';
      const msg = opts.line || 'I AM ALREADY INSIDE YOUR VAULT';
      wrap(g, msg, w / 2 + jitter, 120, w - 60, 22);
      g.font = '11px monospace'; g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillText('FICTIONAL TRANSMISSION — TRAINING SIMULATION', w / 2, h - 22);
      g.textAlign = 'left';
    }

    else if (kind === 'mail') {
      g.fillStyle = '#0e1626'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#16243c'; g.fillRect(0, 0, w, 38);
      g.fillStyle = '#cfe2ff'; g.font = 'bold 15px sans-serif';
      g.fillText('✉ INBOX — warehouse.office', 14, 25);
      const rows = [
        ['URGENT: Delivery payment failed', '#ff4d5e'],
        ['Rota change - week 38', '#9cb7d8'],
        ['Pallet audit results', '#9cb7d8'],
        ['Forklift service booking', '#9cb7d8']
      ];
      rows.forEach((row, i) => {
        const y = 58 + i * 40;
        if (i === 0) {
          const p = 0.5 + 0.5 * Math.sin(t * 3);
          g.fillStyle = `rgba(255,77,94,${0.12 + p * 0.16})`;
          g.fillRect(8, y - 18, w - 16, 34);
        }
        g.fillStyle = row[1]; g.font = i === 0 ? 'bold 14px sans-serif' : '13px sans-serif';
        g.fillText(row[0], 20, y + 3);
        g.fillStyle = '#5c7391'; g.font = '11px monospace';
        g.fillText(['09:14', '08:52', '08:31', 'Yesterday'][i], w - 90, y + 3);
      });
      g.fillStyle = '#ffb020'; g.font = 'bold 12px sans-serif';
      g.fillText('▶ SELECT TO INSPECT', 20, h - 18);
    }

    else if (kind === 'scanner') {
      g.fillStyle = '#06131a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#3ce88f'; g.font = 'bold 18px monospace';
      g.fillText('DELIVERY SCANNER', 16, 32);
      g.font = '13px monospace'; g.fillStyle = '#8fd8b4';
      g.fillText('READY — SCAN PALLET BARCODE', 16, 60);
      // moving scan line over a barcode
      g.fillStyle = '#0b2a22'; g.fillRect(16, 80, w - 32, 110);
      g.fillStyle = '#d9ffe9';
      for (let x = 0; x < w - 60; x += 6) g.fillRect(30 + x, 96, 2 + (x % 11 === 0 ? 3 : 0), 78);
      const ly = 80 + ((t * 90) % 110);
      g.fillStyle = 'rgba(255,77,94,0.85)'; g.fillRect(16, ly, w - 32, 3);
      g.fillStyle = '#8fd8b4'; g.font = '12px monospace';
      g.fillText('USB PORT: OPEN — AUTHORISED DEVICES ONLY', 16, h - 22);
    }

    else if (kind === 'lock') {
      g.fillStyle = '#071223'; g.fillRect(0, 0, w, h);
      g.textAlign = 'center';
      g.fillStyle = '#55e9ff'; g.font = '60px sans-serif';
      g.fillText('\u{1F512}', w / 2, h / 2 - 6);
      g.fillStyle = '#cfe2ff'; g.font = 'bold 16px sans-serif';
      g.fillText('WORKSTATION LOCKED', w / 2, h / 2 + 44);
      g.fillStyle = '#7b90ad'; g.font = '12px sans-serif';
      g.fillText('Secured by Cyber Defence Command', w / 2, h / 2 + 68);
      g.textAlign = 'left';
    }

    else if (kind === 'social') {
      g.fillStyle = '#0d1420'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#16263d'; g.fillRect(0, 0, w, 36);
      g.fillStyle = '#cfe2ff'; g.font = 'bold 14px sans-serif';
      g.fillText('PUBLIC FEED — MONITORING', 14, 24);
      g.fillStyle = 'rgba(255,77,94,0.12)'; g.fillRect(12, 50, w - 24, 120);
      g.strokeStyle = 'rgba(255,77,94,0.5)'; g.lineWidth = 2; g.strokeRect(12, 50, w - 24, 120);
      g.fillStyle = '#ff8f9b'; g.font = 'bold 13px sans-serif';
      g.fillText('@vault_watch_hdv', 26, 74);
      g.fillStyle = '#e8f1ff'; g.font = '13px sans-serif';
      wrapLeft(g, 'LEAKED: internal stock sheets from Himalayan Data Vault warehouse. Share before they take it down.', 26, 98, w - 60, 19);
      g.fillStyle = '#7b90ad'; g.font = '11px monospace';
      g.fillText('shares: ' + (12 + Math.floor(t * 2) % 40), 26, 158);
      g.fillStyle = '#ffb020'; g.font = 'bold 12px sans-serif';
      g.fillText('▶ SELECT TO INVESTIGATE', 26, h - 24);
    }

    if (alertLevel > 0.6) {
      g.fillStyle = `rgba(255,20,40,${(alertLevel - 0.6) * 0.35})`;
      g.fillRect(0, 0, w, h);
    }
  }

  function wrap(ctx, text, cx, y, maxW, lh) {
    const words = text.split(' ');
    let line = '', yy = y;
    words.forEach((word) => {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trim(), cx, yy); line = word + ' '; yy += lh; }
      else line = test;
    });
    ctx.fillText(line.trim(), cx, yy);
  }
  function wrapLeft(ctx, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '', yy = y;
    words.forEach((word) => {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = word + ' '; yy += lh; }
      else line = test;
    });
    ctx.fillText(line.trim(), x, yy);
  }

  frame(0, 0);
  return { canvas: c, frame };
}

/** A simple label/sign canvas (used for door signs, notices, name tags). */
export function signCanvas(text, sub, colour = '#55e9ff', bg = '#0b1526') {
  return makeCanvas('sign:' + text + sub + colour, 512, 160, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = colour; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.textAlign = 'center';
    g.fillStyle = colour; g.font = 'bold 46px sans-serif';
    g.fillText(text, w / 2, h / 2 + 4);
    if (sub) {
      g.fillStyle = 'rgba(255,255,255,0.65)'; g.font = '22px sans-serif';
      g.fillText(sub, w / 2, h / 2 + 44);
    }
    g.textAlign = 'left';
  });
}

/** The yellow sticky note with the written-down password (Mission 3). */
export function stickyNote() {
  return makeCanvas('sticky', 256, 256, (g, w, h) => {
    g.fillStyle = '#f2e06a'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, h - 26, w, 26);
    g.fillStyle = '#2b2b2b'; g.font = 'bold 26px "Comic Sans MS", cursive, sans-serif';
    g.fillText('login: stockroom', 20, 96);
    g.fillText('pw: warehouse', 20, 140);
    g.font = '18px sans-serif'; g.fillStyle = '#6b5a12';
    g.fillText("don't change it!", 20, 184);
  });
}

/** Procedural dusk-mountain sky dome (equirectangular). */
export function skyCanvas() {
  return makeCanvas('sky', 2048, 1024, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0, '#040914');
    sky.addColorStop(0.45, '#0a1b33');
    sky.addColorStop(0.8, '#16304d');
    sky.addColorStop(1, '#2a4a68');
    g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.62);
    // stars
    const r = rng(99);
    for (let i = 0; i < 900; i++) {
      const y = r() * h * 0.42;
      g.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.65})`;
      g.fillRect(r() * w, y, 1.6, 1.6);
    }
    // distant Himalayan ridge lines (three layers)
    const ridge = (baseY, amp, colour, seed) => {
      const rr = rng(seed);
      g.fillStyle = colour;
      g.beginPath();
      g.moveTo(0, h);
      let y = baseY;
      for (let x = 0; x <= w; x += 24) {
        y += (rr() - 0.5) * amp;
        y = Math.max(baseY - amp * 5, Math.min(baseY + amp * 4, y));
        g.lineTo(x, y);
      }
      g.lineTo(w, h); g.closePath(); g.fill();
    };
    ridge(h * 0.50, 26, '#12243c', 5);
    ridge(h * 0.56, 20, '#0d1a2c', 12);
    ridge(h * 0.60, 14, '#08111d', 21);
    // ground haze
    g.fillStyle = '#060d17'; g.fillRect(0, h * 0.62, w, h * 0.38);
  });
}
