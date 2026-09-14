/**
 * world.js
 * Procedurally builds the four areas of the Himalayan Data Vault.
 *
 * Everything is made from A-Frame primitives plus the canvas textures in
 * textures.js, so there are no binary assets to license or download.
 * See "Replacing the assets" in README.md to swap in real models or
 * 360 photographs instead.
 */

import { CONFIG } from './config.js';
import { state, settings } from './state.js';
import { skyCanvas } from './textures.js';

const THREE = window.AFRAME.THREE;

/** Convenience: create an element with attributes and append it. */
function mk(tag, attrs, parent) {
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    el.setAttribute(k, typeof v === 'object' ? v : String(v));
  });
  if (parent) parent.appendChild(el);
  return el;
}

/** Registry of interactive objects so other modules can toggle them. */
export const hotspots = new Map();

function hotspot(el, id, label, opts = {}) {
  el.setAttribute('hotspot', Object.assign({ id, label }, opts));
  hotspots.set(id, el);
  return el;
}

/** Enable / disable a hotspot (used when a mission is finished). */
export function setHotspotActive(id, active) {
  const el = hotspots.get(id);
  if (el) el.setAttribute('hotspot', 'active', active);
}

/** Change what a monitor is displaying (e.g. an unlocked PC becomes locked). */
export function setScreen(id, kind, line) {
  const el = hotspots.get(id) || document.getElementById(id);
  if (!el) return;
  const target = el.querySelector('[live-screen]') || (el.components && el.components['live-screen'] ? el : null);
  const comp = target && target.components ? target.components['live-screen'] : null;
  if (comp && comp.setKind) comp.setKind(kind, line);
}

/* =========================================================================
   Shared room shell
   ========================================================================= */
function buildShell(parent, opts) {
  const { w = 14, d = 10, h = 4, wallKind = 'steel', accent = '#55e9ff' } = opts;

  // Floor
  const floor = mk('a-plane', {
    position: `0 0 0`, rotation: '-90 0 0', width: w, height: d,
    material: 'color: #6b7280; roughness: 0.92; metalness: 0.04',
    tex: `kind: concrete; repeat: ${Math.round(w / 2)} ${Math.round(d / 2)}`,
    shadow: 'receive: true; cast: false'
  }, parent);
  floor.classList.add('floor');

  // Ceiling
  mk('a-plane', {
    position: `0 ${h} 0`, rotation: '90 0 0', width: w, height: d,
    material: 'color: #39414f; roughness: 1',
    tex: `kind: ceiling; repeat: ${Math.round(w / 2)} ${Math.round(d / 2)}`
  }, parent);

  // Walls (back, front, left, right)
  const wallMat = 'color: #8792a5; roughness: 0.85; metalness: 0.12; side: double';
  mk('a-plane', { position: `0 ${h / 2} ${-d / 2}`, width: w, height: h, material: wallMat, tex: `kind: ${wallKind}; repeat: ${Math.round(w / 3)} 1`, shadow: 'receive: true' }, parent);
  mk('a-plane', { position: `0 ${h / 2} ${d / 2}`, rotation: '0 180 0', width: w, height: h, material: wallMat, tex: `kind: ${wallKind}; repeat: ${Math.round(w / 3)} 1`, shadow: 'receive: true' }, parent);
  mk('a-plane', { position: `${-w / 2} ${h / 2} 0`, rotation: '0 90 0', width: d, height: h, material: wallMat, tex: `kind: ${wallKind}; repeat: ${Math.round(d / 3)} 1`, shadow: 'receive: true' }, parent);
  mk('a-plane', { position: `${w / 2} ${h / 2} 0`, rotation: '0 -90 0', width: d, height: h, material: wallMat, tex: `kind: ${wallKind}; repeat: ${Math.round(d / 3)} 1`, shadow: 'receive: true' }, parent);

  // Skirting accent strip - gives the rooms their "command centre" glow line
  [[0, -d / 2 + 0.02, w, 0], [0, d / 2 - 0.02, w, 180], [-w / 2 + 0.02, 0, d, 90], [w / 2 - 0.02, 0, d, -90]].forEach(([x, z, len, ry]) => {
    mk('a-plane', {
      position: `${x} 0.09 ${z}`, rotation: `0 ${ry} 0`, width: len, height: 0.06,
      material: `color: ${accent}; shader: flat; opacity: 0.75; transparent: true`
    }, parent);
  });

  // Ceiling light strips (emissive planes + real lights)
  for (let i = -1; i <= 1; i++) {
    mk('a-box', {
      position: `${i * (w / 3.2)} ${h - 0.08} 0`, width: 0.42, height: 0.08, depth: d - 2.4,
      material: 'color: #eaf4ff; emissive: #cfe6ff; emissiveIntensity: 1.4'
    }, parent);
    mk('a-entity', {
      position: `${i * (w / 3.2)} ${h - 0.35} 0`,
      light: `type: point; color: #b9d6ff; intensity: ${opts.lightIntensity || 0.55}; distance: 13; decay: 2`
    }, parent);
  }

  // One shadow-casting key light per room keeps shadows cheap but present
  mk('a-entity', {
    position: `0 ${h - 0.3} ${-d / 4}`,
    light: `type: spot; color: #dceaff; intensity: ${opts.keyIntensity || 0.9}; angle: 70; penumbra: 0.6; distance: 18; castShadow: true; shadowMapWidth: 1024; shadowMapHeight: 1024; shadowBias: -0.001`,
    rotation: '-90 0 0'
  }, parent);

  // Accent fill light in the room's signature colour
  mk('a-entity', {
    position: `0 2.4 ${d / 2 - 1}`,
    light: `type: point; color: ${accent}; intensity: 0.5; distance: 12; decay: 2`
  }, parent);

  return floor;
}

/** Three doors on the front wall that move the player between areas. */
function buildDoors(parent, currentArea, d, h) {
  const others = CONFIG.areas.filter((a) => a.id !== currentArea);
  const xs = [-4.2, 0, 4.2];
  others.forEach((area, i) => {
    const x = xs[i];
    const group = mk('a-entity', { position: `${x} 0 ${d / 2 - 0.06}`, rotation: '0 180 0' }, parent);

    // Door frame
    mk('a-box', { position: '0 1.15 0.04', width: 1.9, height: 2.3, depth: 0.12, material: 'color: #1c2636; roughness: 0.7; metalness: 0.3' }, group);
    mk('a-box', { position: '0 1.15 0.12', width: 1.62, height: 2.1, depth: 0.06, material: 'color: #2c3a52; roughness: 0.6; metalness: 0.35' }, group);
    // Glow edge
    mk('a-plane', { position: '0 1.15 0.17', width: 1.66, height: 2.14, material: 'color: #55e9ff; shader: flat; opacity: 0.1; transparent: true' }, group);
    // Sign above
    mk('a-plane', {
      position: '0 2.62 0.1', width: 1.9, height: 0.6,
      material: 'shader: flat; side: double',
      sign: `text: ${area.name.toUpperCase()}; sub: ${area.icon ? 'ENTER' : ''}; color: #7ef7ff; bg: #0a1322`
    }, group);

    const panel = mk('a-plane', {
      position: '0 1.15 0.2', width: 1.6, height: 2.1,
      material: 'color: #55e9ff; shader: flat; opacity: 0.05; transparent: true; side: double'
    }, group);
    hotspot(panel, `door:${area.id}`, `Go to ${area.name}`, {
      halo: true, haloColor: '#55e9ff', haloRadius: 0.34, haloOffset: { x: 0, y: 0, z: 0.02 }
    });
  });
}

/** A desk with legs. */
function desk(parent, x, z, w, dep, ry = 0, colour = '#2a3446') {
  const g = mk('a-entity', { position: `${x} 0 ${z}`, rotation: `0 ${ry} 0` }, parent);
  mk('a-box', { position: '0 0.74 0', width: w, height: 0.07, depth: dep, material: `color: ${colour}; roughness: 0.55; metalness: 0.2`, shadow: 'cast: true; receive: true' }, g);
  const lx = w / 2 - 0.12, lz = dep / 2 - 0.12;
  [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([px, pz]) => {
    mk('a-box', { position: `${px} 0.37 ${pz}`, width: 0.07, height: 0.74, depth: 0.07, material: 'color: #1b2230; metalness: 0.5; roughness: 0.4' }, g);
  });
  return g;
}

/** A monitor on a stand. Returns the screen plane entity. */
function monitor(parent, x, y, z, ry, wide, tall, screenAttrs) {
  const g = mk('a-entity', { position: `${x} ${y} ${z}`, rotation: `0 ${ry} 0` }, parent);
  mk('a-box', { position: '0 0.02 0', width: 0.34, height: 0.04, depth: 0.2, material: 'color: #121925; metalness: 0.4' }, g);
  mk('a-box', { position: '0 0.14 0', width: 0.06, height: 0.24, depth: 0.06, material: 'color: #121925; metalness: 0.4' }, g);
  mk('a-box', { position: `0 ${0.26 + tall / 2} -0.02`, width: wide + 0.06, height: tall + 0.06, depth: 0.05, material: 'color: #0d131d; roughness: 0.5; metalness: 0.3', shadow: 'cast: true' }, g);
  const screen = mk('a-plane', {
    position: `0 ${0.26 + tall / 2} 0.012`, width: wide, height: tall,
    material: 'color: #ffffff; shader: standard; emissive: #ffffff; emissiveIntensity: 0.9; roughness: 1',
    'live-screen': screenAttrs
  }, g);
  // Screen bloom
  mk('a-entity', { position: `0 ${0.26 + tall / 2} 0.35`, light: 'type: point; color: #7ec8ff; intensity: 0.5; distance: 3.2; decay: 2' }, g);
  return { group: g, screen };
}

function keyboard(parent, x, y, z, ry = 0) {
  const g = mk('a-entity', { position: `${x} ${y} ${z}`, rotation: `0 ${ry} 0` }, parent);
  mk('a-box', { width: 0.44, height: 0.02, depth: 0.16, material: 'color: #161e2b; roughness: 0.7' }, g);
  mk('a-box', { position: '0 0.012 0', width: 0.4, height: 0.008, depth: 0.13, material: 'color: #0a0f17; emissive: #1d4b6b; emissiveIntensity: 0.6' }, g);
  mk('a-box', { position: '0.34 0 0.02', width: 0.07, height: 0.02, depth: 0.11, material: 'color: #161e2b' }, g);
  return g;
}

function officeChair(parent, x, z, ry = 0) {
  const g = mk('a-entity', { position: `${x} 0 ${z}`, rotation: `0 ${ry} 0` }, parent);
  mk('a-cylinder', { position: '0 0.05 0', radius: 0.3, height: 0.06, material: 'color: #141b26' }, g);
  mk('a-cylinder', { position: '0 0.27 0', radius: 0.04, height: 0.4, material: 'color: #232d3d; metalness: 0.6' }, g);
  mk('a-box', { position: '0 0.49 0', width: 0.5, height: 0.09, depth: 0.48, material: 'color: #29344a; roughness: 0.85', shadow: 'cast: true' }, g);
  mk('a-box', { position: '0 0.78 -0.22', width: 0.48, height: 0.5, depth: 0.09, material: 'color: #29344a; roughness: 0.85' }, g);
  return g;
}

function securityCam(parent, x, y, z, ry) {
  const g = mk('a-entity', { position: `${x} ${y} ${z}`, rotation: `0 ${ry} 0`, 'security-cam': '' }, parent);
  mk('a-box', { position: '0 0 0', width: 0.16, height: 0.14, depth: 0.34, material: 'color: #1d2636; metalness: 0.5; roughness: 0.4' }, g);
  mk('a-cylinder', { position: '0 0 0.2', rotation: '90 0 0', radius: 0.055, height: 0.08, material: 'color: #05080f; metalness: 0.8' }, g);
  mk('a-sphere', { position: '0.07 0.06 0.1', radius: 0.018, material: 'color: #ff4d5e; emissive: #ff4d5e; emissiveIntensity: 1.6', 'blink-led': 'speed: 1.6' }, g);
  mk('a-box', { position: '0 0.14 -0.06', width: 0.05, height: 0.16, depth: 0.05, material: 'color: #1d2636' }, g);
  return g;
}

/** Warehouse pallet racking with boxes. */
function palletRack(parent, x, z, ry, bays = 3) {
  const g = mk('a-entity', { position: `${x} 0 ${z}`, rotation: `0 ${ry} 0` }, parent);
  const bayW = 1.7, H = 3.2;
  for (let i = 0; i <= bays; i++) {
    const px = -bays * bayW / 2 + i * bayW;
    mk('a-box', { position: `${px} ${H / 2} -0.5`, width: 0.1, height: H, depth: 0.1, material: 'color: #1d4b7a; metalness: 0.4; roughness: 0.6' }, g);
    mk('a-box', { position: `${px} ${H / 2} 0.5`, width: 0.1, height: H, depth: 0.1, material: 'color: #1d4b7a; metalness: 0.4; roughness: 0.6' }, g);
  }
  [0.9, 1.9, 2.9].forEach((by) => {
    mk('a-box', { position: `0 ${by} -0.5`, width: bays * bayW, height: 0.11, depth: 0.09, material: 'color: #c96a1c; roughness: 0.7', tex: 'kind: beam; repeat: 6 1' }, g);
    mk('a-box', { position: `0 ${by} 0.5`, width: bays * bayW, height: 0.11, depth: 0.09, material: 'color: #c96a1c; roughness: 0.7', tex: 'kind: beam; repeat: 6 1' }, g);
    mk('a-box', { position: `0 ${by - 0.06} 0`, width: bays * bayW, height: 0.04, depth: 1.0, material: 'color: #3a4658; roughness: 0.9' }, g);
  });
  // Pallets + boxes
  let seed = 3;
  [0.9, 1.9, 2.9].forEach((by, row) => {
    for (let i = 0; i < bays; i++) {
      if ((row + i) % 4 === 3) continue; // leave some gaps so it reads as a real rack
      const px = -bays * bayW / 2 + bayW / 2 + i * bayW;
      mk('a-box', { position: `${px} ${by + 0.07} 0`, width: 1.3, height: 0.1, depth: 0.9, material: 'color: #7a5a34; roughness: 1' }, g);
      mk('a-box', {
        position: `${px} ${by + 0.47} 0`, width: 1.16, height: 0.68, depth: 0.82,
        material: 'color: #c79a65; roughness: 0.95', tex: `kind: box; seed: ${seed++}; repeat: 1 1`,
        shadow: 'cast: true; receive: true'
      }, g);
    }
  });
  return g;
}

/** Server rack cabinet. */
function serverRack(parent, x, z, ry, seed) {
  const g = mk('a-entity', { position: `${x} 0 ${z}`, rotation: `0 ${ry} 0` }, parent);
  mk('a-box', { position: '0 1.05 0', width: 0.85, height: 2.1, depth: 1.0, material: 'color: #121821; roughness: 0.6; metalness: 0.35', shadow: 'cast: true; receive: true' }, g);
  mk('a-plane', {
    position: '0 1.05 0.505', width: 0.78, height: 2.0,
    material: 'color: #ffffff; roughness: 0.85; emissive: #ffffff; emissiveIntensity: 0.28',
    tex: `kind: rack; seed: ${seed}; repeat: 1 1`
  }, g);
  mk('a-box', { position: '0 2.13 0', width: 0.9, height: 0.06, depth: 1.05, material: 'color: #0b1018; metalness: 0.5' }, g);
  mk('a-sphere', { position: '0.3 2.18 0.3', radius: 0.028, material: 'color: #3ce88f; emissive: #3ce88f; emissiveIntensity: 2', 'blink-led': `speed: ${1 + (seed % 4) * 0.4}; phase: ${seed}` }, g);
  return g;
}

/* =========================================================================
   AREA 1 - WAREHOUSE OFFICE
   ========================================================================= */
function buildOffice(root) {
  const o = CONFIG.areaOrigin.office;
  const a = mk('a-entity', { id: 'area-office', position: `${o.x} 0 ${o.z}` }, root);
  buildShell(a, { wallKind: 'steel', accent: '#55e9ff', lightIntensity: 0.55 });
  buildDoors(a, 'office', 10, 4);

  // --- Main desk with the phishing workstation (MISSION 1) ---
  desk(a, -2.6, -3.2, 3.4, 1.3, 0);
  const pc = monitor(a, -3.3, 0.775, -3.3, 4, 1.0, 0.62, 'kind: mail; seed: 1');
  hotspot(pc.screen, 'office-pc', 'Inspect the suspicious email', {
    halo: true, haloColor: '#ff4d5e', haloRadius: 0.5, haloOffset: { x: 0, y: 0, z: 0.06 }
  });
  const pc2 = monitor(a, -1.9, 0.775, -3.3, -6, 0.9, 0.56, 'kind: stock; seed: 2');
  pc2.screen.setAttribute('data-role', 'stock');
  keyboard(a, -2.7, 0.79, -2.75, 2);
  officeChair(a, -2.6, -2.15, 8);
  // Desk tidy details
  mk('a-cylinder', { position: '-1.25 0.83 -3.0', radius: 0.05, height: 0.12, material: 'color: #7ea2c4; roughness: 0.4; metalness: 0.3' }, a);
  mk('a-box', { position: '-1.0 0.79 -2.9', width: 0.28, height: 0.03, depth: 0.2, rotation: '0 12 0', material: 'color: #e8eef6' }, a);

  // --- Wall display: social media leak (MISSION 4) ---
  const wallScreenGroup = mk('a-entity', { position: '3.4 2.05 -4.92' }, a);
  mk('a-box', { position: '0 0 -0.03', width: 3.5, height: 2.0, depth: 0.09, material: 'color: #0b111c; metalness: 0.4; roughness: 0.5' }, wallScreenGroup);
  const wallScreen = mk('a-plane', {
    position: '0 0 0.03', width: 3.3, height: 1.82,
    material: 'color: #ffffff; shader: standard; emissive: #ffffff; emissiveIntensity: 0.85; roughness: 1',
    'live-screen': 'kind: social; seed: 4; w: 640; h: 360'
  }, wallScreenGroup);
  hotspot(wallScreen, 'wall-screen', 'Investigate the leaked-data post', {
    halo: true, haloColor: '#ff4d5e', haloRadius: 0.6, haloOffset: { x: 0, y: 0, z: 0.05 }
  });
  mk('a-entity', { position: '3.4 2.05 -4.2', light: 'type: point; color: #ff6b7a; intensity: 0.7; distance: 5; decay: 2' }, a);

  // --- Window onto the fictional hill city ---
  const win = mk('a-entity', { position: '6.92 2.1 1.2', rotation: '0 -90 0' }, a);
  mk('a-box', { position: '0 0 -0.04', width: 4.4, height: 2.2, depth: 0.1, material: 'color: #1b2432; metalness: 0.4' }, win);
  mk('a-plane', { position: '0 0 0.03', width: 4.1, height: 1.95, material: 'color: #16304d; emissive: #1d4b6b; emissiveIntensity: 0.7; opacity: 0.92; transparent: true' }, win);
  mk('a-box', { position: '0 0 0.05', width: 0.06, height: 1.95, depth: 0.02, material: 'color: #1b2432' }, win);

  // --- Printer (hidden threat for the finale) ---
  const printerGroup = mk('a-entity', { position: '5.2 0 -3.6' }, a);
  mk('a-box', { position: '0 0.35 0', width: 0.9, height: 0.7, depth: 0.7, material: 'color: #39445a; roughness: 0.8', shadow: 'cast: true' }, printerGroup);
  mk('a-box', { position: '0 0.73 0', width: 0.94, height: 0.08, depth: 0.74, material: 'color: #232c3d' }, printerGroup);
  const papers = mk('a-box', { position: '0 0.79 0.16', width: 0.62, height: 0.05, depth: 0.44, material: 'color: #f1f4f9; roughness: 1' }, printerGroup);
  hotspot(papers, 'h-printer', 'Confidential documents left on the printer', {
    active: false, halo: true, haloColor: '#ff4d5e', haloRadius: 0.32, haloOffset: { x: 0, y: 0.25, z: 0 }
  });

  // --- Filing cabinets, plant, notice ---
  [-6.2, -5.3].forEach((x, i) => {
    mk('a-box', { position: `${x} 0.62 -4.3`, width: 0.8, height: 1.24, depth: 0.7, material: 'color: #37435a; roughness: 0.75; metalness: 0.15', shadow: 'cast: true' }, a);
    for (let k = 0; k < 3; k++) {
      mk('a-box', { position: `${x} ${0.28 + k * 0.36} -3.94`, width: 0.68, height: 0.03, depth: 0.02, material: 'color: #8ea4c0' }, a);
    }
  });
  mk('a-plane', {
    position: '-6.94 2.3 -1.5', rotation: '0 90 0', width: 2.2, height: 0.8,
    material: 'shader: standard; side: double; emissive: #ffffff; emissiveIntensity: 0.2',
    sign: 'text: CYBER RULES; sub: LOCK IT • CHECK IT • REPORT IT; color: #ffb020; bg: #101826'
  }, a);

  securityCam(a, 6.5, 3.5, -4.4, -135);

  // --- NPC: Anjali Rana, Office Supervisor (fictional character) ---
  mk('a-entity', {
    id: 'npc-anjali', position: '-0.4 0 -1.6', rotation: '0 15 0',
    npc: 'name: Anjali Rana; role: Office Supervisor; vest: #f3a11c; skin: #b98a63; helmet: #eef3fa; phase: 0.4'
  }, a);

  return a;
}

/* =========================================================================
   AREA 2 - LOADING BAY
   ========================================================================= */
function buildBay(root) {
  const o = CONFIG.areaOrigin.bay;
  const a = mk('a-entity', { id: 'area-bay', position: `${o.x} 0 ${o.z}` }, root);
  buildShell(a, { wallKind: 'steelDark', accent: '#ffb020', lightIntensity: 0.5 });
  buildDoors(a, 'bay', 10, 4);

  // Hazard stripe along the bay edge
  mk('a-plane', { position: '0 0.012 -3.2', rotation: '-90 0 0', width: 13, height: 0.5, material: 'color: #e0a52a; roughness: 1', tex: 'kind: hazard; repeat: 10 1' }, a);

  // Roller shutter door
  const shutter = mk('a-entity', { position: '0 0 -4.9' }, a);
  mk('a-box', { position: '0 1.7 0', width: 5.4, height: 3.4, depth: 0.14, material: 'color: #4a5568; roughness: 0.7; metalness: 0.4' }, shutter);
  for (let y = 0.18; y < 3.4; y += 0.22) {
    mk('a-box', { position: `0 ${y} 0.09`, width: 5.2, height: 0.16, depth: 0.04, material: 'color: #59657a; roughness: 0.6; metalness: 0.5' }, shutter);
  }
  mk('a-plane', { position: '0 3.72 0.1', width: 3.2, height: 0.55, material: 'shader: standard; emissive: #ffffff; emissiveIntensity: 0.3', sign: 'text: BAY 01; sub: GOODS INWARD; color: #ffb020; bg: #10151f' }, shutter);

  // Pallet racking
  palletRack(a, -4.6, -1.4, 0, 3);
  palletRack(a, -4.6, 2.2, 0, 3);
  palletRack(a, 5.0, 0.4, 90, 3);

  // --- Delivery scanner podium (MISSION 2 context) ---
  const podium = mk('a-entity', { position: '1.6 0 -1.2', rotation: '0 -18 0' }, a);
  mk('a-box', { position: '0 0.5 0', width: 0.9, height: 1.0, depth: 0.6, material: 'color: #263349; roughness: 0.6; metalness: 0.25', shadow: 'cast: true' }, podium);
  mk('a-box', { position: '0 1.02 0', width: 0.96, height: 0.06, depth: 0.66, material: 'color: #1a2231' }, podium);
  const scanner = monitor(podium, 0, 1.05, -0.04, 0, 0.72, 0.46, 'kind: scanner; seed: 5');
  scanner.screen.setAttribute('data-role', 'scanner');
  mk('a-box', { position: '0.3 1.09 0.2', width: 0.14, height: 0.06, depth: 0.3, material: 'color: #11161f; metalness: 0.4' }, podium);
  mk('a-sphere', { position: '0.3 1.14 0.34', radius: 0.02, material: 'color: #3ce88f; emissive: #3ce88f; emissiveIntensity: 2', 'blink-led': 'speed: 2.4' }, podium);

  // --- The unknown USB drive (MISSION 2) ---
  const usbGroup = mk('a-entity', { position: '1.0 0.04 0.35', rotation: '0 34 0', bob: 'amp: 0.012; speed: 2' }, a);
  const usb = mk('a-box', { width: 0.19, height: 0.06, depth: 0.07, material: 'color: #d8dee8; roughness: 0.4; metalness: 0.3' }, usbGroup);
  mk('a-box', { position: '0.12 0 0', width: 0.08, height: 0.035, depth: 0.05, material: 'color: #b9c3d1; metalness: 0.85; roughness: 0.25' }, usbGroup);
  mk('a-plane', { position: '0 0.032 0', rotation: '-90 0 0', width: 0.16, height: 0.06, material: 'color: #f2e06a; shader: flat' }, usbGroup);
  mk('a-entity', { position: '0 0.4 0', light: 'type: point; color: #ffb020; intensity: 0.5; distance: 2; decay: 2' }, usbGroup);
  hotspot(usb, 'usb-drive', 'Examine the unknown USB drive', {
    halo: true, haloColor: '#ffb020', haloRadius: 0.22, haloOffset: { x: 0, y: 0.26, z: 0 }
  });

  // --- Pallet truck ---
  const truck = mk('a-entity', { position: '-1.4 0 2.9', rotation: '0 -24 0' }, a);
  mk('a-box', { position: '0 0.12 0', width: 0.7, height: 0.1, depth: 1.5, material: 'color: #d4680f; roughness: 0.6; metalness: 0.3', shadow: 'cast: true' }, truck);
  mk('a-box', { position: '0 0.62 -0.72', width: 0.1, height: 1.1, depth: 0.1, rotation: '-12 0 0', material: 'color: #1f2836; metalness: 0.6' }, truck);
  [[-0.28, 0.7], [0.28, 0.7], [-0.28, -0.6], [0.28, -0.6]].forEach(([wx, wz]) => {
    mk('a-cylinder', { position: `${wx} 0.07 ${wz}`, rotation: '0 0 90', radius: 0.07, height: 0.07, material: 'color: #11161f' }, truck);
  });

  // Crates on the floor
  [[-2.6, -2.4, 0], [-2.0, -2.6, 22], [3.9, 2.8, -14]].forEach(([cx, cz, ry], i) => {
    mk('a-box', {
      position: `${cx} 0.42 ${cz}`, rotation: `0 ${ry} 0`, width: 0.9, height: 0.84, depth: 0.9,
      material: 'color: #c79a65; roughness: 0.95', tex: `kind: box; seed: ${20 + i}`, shadow: 'cast: true; receive: true'
    }, a);
  });

  // --- Propped fire door (hidden threat for the finale) ---
  const fire = mk('a-entity', { position: '-6.88 0 2.6', rotation: '0 90 0' }, a);
  mk('a-box', { position: '0 1.1 0', width: 1.5, height: 2.2, depth: 0.1, material: 'color: #2f6b4a; roughness: 0.7' }, fire);
  mk('a-box', { position: '0.5 1.05 0.1', width: 0.1, height: 0.1, depth: 0.4, material: 'color: #cfd8e4; metalness: 0.6' }, fire);
  const wedge = mk('a-box', { position: '0.35 0.1 0.55', rotation: '0 0 8', width: 0.5, height: 0.2, depth: 0.6, material: 'color: #8a6434; roughness: 1' }, fire);
  mk('a-plane', { position: '0 2.5 0.06', width: 1.4, height: 0.42, material: 'shader: standard; emissive: #ffffff; emissiveIntensity: 0.35', sign: 'text: FIRE EXIT; sub: KEEP CLEAR; color: #3ce88f; bg: #0d1a14' }, fire);
  hotspot(wedge, 'h-tailgate', 'Fire door propped open', {
    active: false, halo: true, haloColor: '#ff4d5e', haloRadius: 0.3, haloOffset: { x: 0, y: 0.35, z: 0 }
  });

  securityCam(a, -6.4, 3.5, -4.3, 45);

  // --- NPC: Bikash Thapa, Logistics Lead (fictional character) ---
  mk('a-entity', {
    id: 'npc-bikash', position: '2.9 0 0.9', rotation: '0 -40 0',
    npc: 'name: Bikash Thapa; role: Logistics Lead; vest: #f3d21c; skin: #8d6244; helmet: #ffb020; phase: 1.2'
  }, a);

  return a;
}

/* =========================================================================
   AREA 3 - STAFF ROOM
   ========================================================================= */
function buildStaff(root) {
  const o = CONFIG.areaOrigin.staff;
  const a = mk('a-entity', { id: 'area-staff', position: `${o.x} 0 ${o.z}` }, root);
  buildShell(a, { wallKind: 'steelLight', accent: '#3ce88f', lightIntensity: 0.6 });
  buildDoors(a, 'staff', 10, 4);

  // Lockers
  const lockers = mk('a-entity', { position: '-4.6 0 -4.5' }, a);
  for (let i = 0; i < 6; i++) {
    const x = -2.2 + i * 0.88;
    mk('a-box', { position: `${x} 0.95 0`, width: 0.84, height: 1.9, depth: 0.6, material: 'color: #33546b; roughness: 0.6; metalness: 0.3', shadow: 'cast: true' }, lockers);
    mk('a-box', { position: `${x} 1.5 0.31`, width: 0.5, height: 0.02, depth: 0.02, material: 'color: #16222c' }, lockers);
    mk('a-sphere', { position: `${x + 0.3} 0.95 0.32`, radius: 0.03, material: 'color: #cfd8e4; metalness: 0.8' }, lockers);
  }

  // Table + chairs + kitchenette
  const table = mk('a-entity', { position: '2.4 0 1.2' }, a);
  mk('a-box', { position: '0 0.75 0', width: 2.4, height: 0.08, depth: 1.2, material: 'color: #6b5638; roughness: 0.7', shadow: 'cast: true; receive: true' }, table);
  [[-1.05, -0.45], [1.05, -0.45], [-1.05, 0.45], [1.05, 0.45]].forEach(([px, pz]) => {
    mk('a-box', { position: `${px} 0.37 ${pz}`, width: 0.08, height: 0.75, depth: 0.08, material: 'color: #2a3446; metalness: 0.5' }, table);
  });
  mk('a-cylinder', { position: '0.4 0.83 0.1', radius: 0.06, height: 0.11, material: 'color: #e8eef6; roughness: 0.4' }, table);
  mk('a-cylinder', { position: '-0.5 0.83 -0.2', radius: 0.06, height: 0.11, material: 'color: #ffb020; roughness: 0.4' }, table);
  officeChair(a, 1.1, 1.2, 90);
  officeChair(a, 3.7, 1.2, -90);

  const counter = mk('a-entity', { position: '5.4 0 -2.4', rotation: '0 -90 0' }, a);
  mk('a-box', { position: '0 0.45 0', width: 3.0, height: 0.9, depth: 0.65, material: 'color: #2c3a4e; roughness: 0.7' }, counter);
  mk('a-box', { position: '0 0.92 0', width: 3.05, height: 0.05, depth: 0.7, material: 'color: #8c98a8; roughness: 0.35; metalness: 0.2' }, counter);
  mk('a-box', { position: '-0.9 1.12 0', width: 0.55, height: 0.35, depth: 0.4, material: 'color: #1d2734; metalness: 0.4' }, counter); // microwave
  mk('a-plane', { position: '-0.9 1.14 0.21', width: 0.36, height: 0.2, material: 'color: #0a1018; emissive: #55e9ff; emissiveIntensity: 0.35' }, counter);
  mk('a-cylinder', { position: '0.4 1.07 0', radius: 0.1, height: 0.25, material: 'color: #d8dee8; roughness: 0.3; metalness: 0.35' }, counter); // kettle

  // --- Shared workstation (MISSION 3) ---
  desk(a, -1.4, -3.3, 2.0, 1.1, 0);
  const staffPc = monitor(a, -1.4, 0.775, -3.4, 0, 1.0, 0.62, 'kind: code; seed: 6');
  hotspot(staffPc.screen, 'staff-pc', 'Secure the shared workstation', {
    halo: true, haloColor: '#ffb020', haloRadius: 0.5, haloOffset: { x: 0, y: 0, z: 0.06 }
  });
  keyboard(a, -1.4, 0.79, -2.9);
  officeChair(a, -1.4, -2.3, 0);
  // The written-down password on a sticky note
  const sticky = mk('a-plane', {
    position: '-0.78 1.14 -3.36', rotation: '0 -16 6', width: 0.2, height: 0.2,
    material: 'color: #f2e06a; roughness: 1; side: double', tex: 'kind: sticky'
  }, a);
  sticky.setAttribute('data-role', 'sticky-note');

  // Noticeboard
  mk('a-plane', {
    position: '0.1 2.2 -4.92', width: 2.6, height: 1.2,
    material: 'shader: standard; emissive: #ffffff; emissiveIntensity: 0.2',
    sign: 'text: STAFF NOTICE; sub: NEVER WRITE PASSWORDS DOWN; color: #3ce88f; bg: #0e1a16'
  }, a);

  // --- Rogue access point behind the lockers (hidden threat for the finale) ---
  const ap = mk('a-entity', { position: '-6.6 0.55 -3.1', rotation: '0 12 0' }, a);
  mk('a-box', { width: 0.3, height: 0.09, depth: 0.24, material: 'color: #1a2230; roughness: 0.5; metalness: 0.3' }, ap);
  mk('a-cylinder', { position: '-0.1 0.16 0', radius: 0.012, height: 0.26, material: 'color: #2c3a4e' }, ap);
  mk('a-cylinder', { position: '0.1 0.16 0', radius: 0.012, height: 0.26, material: 'color: #2c3a4e' }, ap);
  const apLed = mk('a-sphere', { position: '0.11 0.05 0.13', radius: 0.022, material: 'color: #ff4d5e; emissive: #ff4d5e; emissiveIntensity: 2', 'blink-led': 'speed: 3' }, ap);
  hotspot(apLed, 'h-rogueap', 'Unknown wireless device', {
    active: false, halo: true, haloColor: '#ff4d5e', haloRadius: 0.24, haloOffset: { x: 0, y: 0.3, z: 0 }
  });

  securityCam(a, 6.4, 3.5, 4.3, 200);

  // --- NPC: Maya Gurung, Shift Supervisor (fictional character) ---
  mk('a-entity', {
    id: 'npc-maya', position: '0.6 0 -1.4', rotation: '0 -20 0',
    npc: 'name: Maya Gurung; role: Shift Supervisor; vest: #29b57a; skin: #a87551; helmet: #e8eef6; phase: 2.1'
  }, a);

  return a;
}

/* =========================================================================
   AREA 4 - SERVER ROOM
   ========================================================================= */
function buildServer(root) {
  const o = CONFIG.areaOrigin.server;
  const a = mk('a-entity', { id: 'area-server', position: `${o.x} 0 ${o.z}` }, root);
  buildShell(a, { wallKind: 'steelDark', accent: '#ff4d5e', lightIntensity: 0.3, keyIntensity: 0.5 });
  buildDoors(a, 'server', 10, 4);

  // Raised-floor grille strip down the cold aisle
  mk('a-plane', { position: '0 0.014 0', rotation: '-90 0 0', width: 2.4, height: 9, material: 'color: #1a212c; roughness: 0.9; metalness: 0.3' }, a);

  // Two rows of racks
  let seed = 1;
  for (let i = 0; i < 4; i++) {
    serverRack(a, -2.0, -3.2 + i * 1.5, 90, seed++);
    serverRack(a, 2.0, -3.2 + i * 1.5, -90, seed++);
  }
  serverRack(a, -5.2, -3.0, 0, seed++);
  serverRack(a, -5.2, -1.9, 0, seed++);
  serverRack(a, 5.2, -3.0, 0, seed++);

  // Overhead cable trays
  [-2.9, 2.9].forEach((x) => {
    mk('a-box', { position: `${x} 3.4 0`, width: 0.5, height: 0.06, depth: 9, material: 'color: #2a3446; metalness: 0.5; roughness: 0.5' }, a);
    for (let k = -4; k <= 4; k++) {
      mk('a-box', { position: `${x} 3.46 ${k}`, width: 0.42, height: 0.05, depth: 0.06, material: 'color: #1d4b7a' }, a);
    }
  });

  // --- Incident console (MISSION 5) ---
  const console3d = mk('a-entity', { position: '0 0 -4.1' }, a);
  mk('a-box', { position: '0 0.5 0', width: 1.6, height: 1.0, depth: 0.7, material: 'color: #24303f; roughness: 0.6; metalness: 0.3', shadow: 'cast: true' }, console3d);
  mk('a-box', { position: '0 1.02 0', width: 1.7, height: 0.06, depth: 0.8, material: 'color: #161e2b' }, console3d);
  const consoleScreen = monitor(console3d, 0, 1.05, -0.06, 0, 1.2, 0.7, 'kind: alert; seed: 7; line: MALWARE SIGNATURE DETECTED — NODE 04');
  hotspot(consoleScreen.screen, 'server-console', 'Begin incident response', {
    halo: true, haloColor: '#ff4d5e', haloRadius: 0.58, haloOffset: { x: 0, y: 0, z: 0.06 }
  });
  keyboard(console3d, 0, 1.06, 0.28);

  // --- Phantom Hacker wall display (fictional on-screen message only) ---
  const phantomWall = mk('a-entity', { position: '0 2.55 -4.93' }, a);
  mk('a-box', { position: '0 0 -0.04', width: 4.2, height: 1.7, depth: 0.1, material: 'color: #10060a; metalness: 0.4' }, phantomWall);
  mk('a-plane', {
    id: 'phantom-screen', position: '0 0 0.03', width: 4.0, height: 1.55,
    material: 'color: #ffffff; shader: standard; emissive: #ffffff; emissiveIntensity: 0.9; roughness: 1',
    'live-screen': 'kind: phantom; seed: 8; w: 640; h: 300; line: I AM ALREADY INSIDE YOUR VAULT'
  }, phantomWall);

  // Rotating alert beacons
  [-5.8, 5.8].forEach((x, i) => {
    const beacon = mk('a-entity', { position: `${x} 3.3 -2.2` }, a);
    mk('a-cylinder', { position: '0 0.16 0', radius: 0.12, height: 0.05, material: 'color: #2a3446; metalness: 0.6' }, beacon);
    mk('a-sphere', {
      position: '0 0 0', radius: 0.17, 'theta-length': 180,
      material: 'color: #ff4d5e; emissive: #ff4d5e; emissiveIntensity: 1.4; transparent: true; opacity: 0.8',
      'alert-light': `speed: ${2 + i * 0.4}`
    }, beacon);
  });

  // Floor haze lights
  mk('a-entity', { position: '0 0.6 0', light: 'type: point; color: #ff4d5e; intensity: 0.45; distance: 10; decay: 2' }, a);
  securityCam(a, 6.4, 3.5, -4.3, 135);

  // --- NPC: Rajan Shrestha, IT Security Officer (fictional character) ---
  mk('a-entity', {
    id: 'npc-rajan', position: '1.5 0 -2.2', rotation: '0 -140 0',
    npc: 'name: Rajan Shrestha; role: IT Security Officer; vest: #2f6fb5; skin: #7d5539; helmet: #e8eef6; phase: 3.3'
  }, a);

  return a;
}

/* =========================================================================
   Public API
   ========================================================================= */

let areaEls = {};

export function buildWorld() {
  const root = document.getElementById('world');
  root.innerHTML = '';
  hotspots.clear();

  areaEls = {
    office: buildOffice(root),
    bay: buildBay(root),
    staff: buildStaff(root),
    server: buildServer(root)
  };

  // Global lighting: a dim ambient so nothing is ever pitch black
  mk('a-entity', { id: 'ambient', light: 'type: ambient; color: #4c6a8f; intensity: 0.55' }, root);
  mk('a-entity', { id: 'hemi', light: 'type: hemisphere; color: #9fc6ff; groundColor: #1a2130; intensity: 0.45' }, root);

  // Procedural dusk sky
  const sky = document.getElementById('sky');
  const tex = new THREE.CanvasTexture(skyCanvas());
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  const applySky = () => {
    const mesh = sky.getObject3D('mesh');
    if (mesh) { mesh.material.map = tex; mesh.material.color.set('#ffffff'); mesh.material.needsUpdate = true; }
    else setTimeout(applySky, 80);
  };
  applySky();

  showOnly(state.area);
  return areaEls;
}

/** Only render the area the player is standing in (keeps frame rate high). */
export function showOnly(areaId) {
  Object.entries(areaEls).forEach(([id, el]) => {
    if (el) el.setAttribute('visible', id === areaId);
  });
}

/** Move the player rig into an area with a short fade. */
export function teleportTo(areaId, onArrive) {
  const rig = document.getElementById('rig');
  const area = CONFIG.areas.find((x) => x.id === areaId);
  const origin = CONFIG.areaOrigin[areaId];
  if (!rig || !area || !origin) return;

  const fade = document.createElement('div');
  fade.className = 'scene-fade';
  fade.style.cssText = 'position:fixed;inset:0;z-index:55;background:#04070e;opacity:0;pointer-events:none;transition:opacity .28s ease';
  document.body.appendChild(fade);

  const ms = settings.reduceMotion ? 60 : 280;
  requestAnimationFrame(() => { fade.style.opacity = '1'; });

  setTimeout(() => {
    rig.object3D.position.set(origin.x + area.spawn.x, 0, origin.z + area.spawn.z);
    // Face into the room
    const cam = document.getElementById('camera');
    if (cam && cam.components['look-controls']) {
      const lc = cam.components['look-controls'];
      lc.pitchObject.rotation.x = 0;
      lc.yawObject.rotation.y = 0; // face into the room (towards the back wall)
    }
    showOnly(areaId);
    if (onArrive) onArrive();
    fade.style.opacity = '0';
    setTimeout(() => fade.remove(), ms + 60);
  }, ms);
}

/** Make one of the staff NPCs speak (also mirrored into the subtitle bar). */
export function npcSay(npcId, text) {
  const el = document.getElementById('npc-' + npcId);
  if (!el || !el.components || !el.components.npc) return;
  el.components.npc.say(text);
}
