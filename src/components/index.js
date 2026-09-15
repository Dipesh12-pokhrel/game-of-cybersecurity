/**
 * components/index.js
 * Custom A-Frame components used to build the Himalayan Data Vault.
 *
 * Registering them in one file keeps the world builder declarative:
 * world.js writes entities, these components give them behaviour.
 */

import { CONFIG } from '../game/config.js';
import { settings, state } from '../game/state.js';
import * as TEX from '../game/textures.js';

const AFRAME = window.AFRAME;
const THREE = AFRAME.THREE;

/** True when the entity and all of its ancestors are visible. */
function isRendered(el) {
  let obj = el.object3D;
  while (obj) {
    if (obj.visible === false) return false;
    obj = obj.parent;
  }
  return true;
}

/**
 * Runs `cb` once the entity has a three.js mesh AND all of its components have
 * initialised.
 *
 * Waiting for `loaded` rather than `object3dset` matters: the geometry
 * component creates the mesh before the material component has run, so a map
 * applied on `object3dset` is thrown away when `material` replaces the
 * placeholder material a moment later. `loaded` fires after both.
 */
function whenMesh(el, cb) {
  const run = () => {
    const mesh = el.getObject3D('mesh');
    if (!mesh) return false;
    cb(mesh);
    return true;
  };

  if (el.hasLoaded && run()) return;

  const afterLoad = () => {
    if (run()) return;
    // Geometry attached later than the rest of the entity: wait for it, then
    // defer a tick so any material update lands first.
    const onSet = (evt) => {
      // `object3dset` bubbles, so ignore events from child entities.
      if (evt.target !== el || evt.detail.type !== 'mesh') return;
      el.removeEventListener('object3dset', onSet);
      setTimeout(run, 0);
    };
    el.addEventListener('object3dset', onSet);
  };

  if (el.hasLoaded) afterLoad();
  else el.addEventListener('loaded', afterLoad, { once: true });
}

/* =========================================================================
   tex - applies a procedurally drawn canvas texture to an entity's material
   ========================================================================= */
const TEXTURE_FACTORIES = {
  concrete: TEX.concreteFloor,
  steel: TEX.steelPanel,
  steelDark: () => TEX.steelPanel('#27324a'),
  steelLight: () => TEX.steelPanel('#4b5a75'),
  hazard: TEX.hazardStripes,
  ceiling: TEX.ceilingPanel,
  rack: TEX.rackFace,
  beam: TEX.rackBeam,
  box: TEX.cardboard,
  sticky: TEX.stickyNote
};

AFRAME.registerComponent('tex', {
  schema: {
    kind: { type: 'string' },
    repeat: { type: 'vec2', default: { x: 1, y: 1 } },
    seed: { type: 'number', default: 1 }
  },
  init() {
    const factory = TEXTURE_FACTORIES[this.data.kind];
    if (!factory) { console.warn('[CDHDV] unknown texture kind', this.data.kind); return; }
    const canvas = factory(this.data.seed);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(this.data.repeat.x, this.data.repeat.y);
    texture.anisotropy = 4;
    if ('colorSpace' in texture) texture.colorSpace = THREE.SRGBColorSpace;
    whenMesh(this.el, (mesh) => {
      mesh.material.map = texture;
      mesh.material.needsUpdate = true;
    });
  }
});

/* =========================================================================
   live-screen - animated monitor content drawn on a canvas every frame
   ========================================================================= */
AFRAME.registerComponent('live-screen', {
  schema: {
    kind: { type: 'string', default: 'code' },
    line: { type: 'string', default: '' },
    seed: { type: 'number', default: 1 },
    fps: { type: 'number', default: 18 },
    w: { type: 'number', default: 512 },
    h: { type: 'number', default: 320 }
  },
  init() {
    this.screen = TEX.makeScreen(this.data.kind, {
      seed: this.data.seed, line: this.data.line, w: this.data.w, h: this.data.h
    });
    this.texture = new THREE.CanvasTexture(this.screen.canvas);
    if ('colorSpace' in this.texture) this.texture.colorSpace = THREE.SRGBColorSpace;
    this.acc = 0;
    whenMesh(this.el, (mesh) => {
      mesh.material.map = this.texture;
      mesh.material.emissiveMap = this.texture;
      if (mesh.material.emissive) mesh.material.emissive.set('#ffffff');
      mesh.material.emissiveIntensity = 0.9;
      mesh.material.needsUpdate = true;
    });
  },
  /** Swap the displayed content at runtime (e.g. a PC becomes "locked"). */
  setKind(kind, line) {
    this.screen = TEX.makeScreen(kind, { seed: this.data.seed, line: line || '', w: this.data.w, h: this.data.h });
    this.texture.image = this.screen.canvas;
    this.texture.needsUpdate = true;
  },
  tick(time, delta) {
    this.acc += delta;
    const step = 1000 / this.data.fps;
    if (this.acc < step) return;
    this.acc = 0;
    // Only the area the player is standing in is rendered, so there is no
    // point repainting screens in the other three areas.
    if (!isRendered(this.el)) return;
    this.screen.frame(time / 1000, state.attack / 100);
    this.texture.needsUpdate = true;
  }
});

/* =========================================================================
   hotspot - a clickable threat / object with hover glow and a HUD label
   ========================================================================= */
AFRAME.registerComponent('hotspot', {
  schema: {
    id: { type: 'string' },
    label: { type: 'string', default: 'Inspect' },
    active: { type: 'boolean', default: true },
    halo: { type: 'boolean', default: true },
    haloColor: { type: 'color', default: '#ffb020' },
    haloRadius: { type: 'number', default: 0.42 },
    haloOffset: { type: 'vec3', default: { x: 0, y: 0, z: 0 } }
  },
  init() {
    this.el.classList.add('clickable');
    this.hover = false;
    this.baseScale = this.el.object3D.scale.clone();

    if (this.data.halo) this.buildHalo();

    this.onEnter = () => {
      if (!this.data.active) return;
      this.hover = true;
      this.el.sceneEl.emit('hotspot-hover', { id: this.data.id, label: this.data.label, on: true });
      this.el.object3D.scale.copy(this.baseScale).multiplyScalar(1.07);
    };
    this.onLeave = () => {
      this.hover = false;
      this.el.sceneEl.emit('hotspot-hover', { id: this.data.id, on: false });
      this.el.object3D.scale.copy(this.baseScale);
    };
    this.onClick = () => {
      if (!this.data.active) return;
      window.dispatchEvent(new CustomEvent('hotspot-activate', { detail: { id: this.data.id } }));
    };

    this.el.addEventListener('mouseenter', this.onEnter);
    this.el.addEventListener('mouseleave', this.onLeave);
    this.el.addEventListener('click', this.onClick);
  },
  buildHalo() {
    const halo = document.createElement('a-entity');
    halo.setAttribute('geometry', `primitive: ring; radiusInner: ${this.data.haloRadius}; radiusOuter: ${this.data.haloRadius + 0.07}`);
    halo.setAttribute('material', `color: ${this.data.haloColor}; shader: flat; side: double; transparent: true; opacity: 0.85`);
    halo.setAttribute('position', this.data.haloOffset);
    halo.setAttribute('billboard', '');
    halo.classList.add('halo');
    this.halo = halo;
    this.el.appendChild(halo);
    // The halo is decoration only - make sure the ray passes straight through
    // it so the hit always resolves to the hotspot itself.
    whenMesh(halo, (mesh) => { mesh.raycast = () => {}; });
  },
  /**
   * Turn the hotspot on/off (used once a mission is resolved, and to reveal
   * the hidden threats during the finale).
   *
   * The `.clickable` class deliberately stays on the element: the raycaster
   * caches its target list, so we gate on `active` here instead of removing
   * and re-adding the class.
   */
  update() {
    if (this.halo) this.halo.setAttribute('visible', this.data.active);
    if (!this.data.active && this.baseScale) this.el.object3D.scale.copy(this.baseScale);
  },
  tick(time) {
    if (!this.halo || !this.data.active) return;
    const t = time / 1000;
    const pulse = settings.reduceMotion ? 1 : 1 + Math.sin(t * 3) * 0.13;
    this.halo.object3D.scale.setScalar(pulse);
    const mat = this.halo.getObject3D('mesh');
    if (mat) mat.material.opacity = this.hover ? 1 : (settings.reduceMotion ? 0.8 : 0.55 + Math.sin(t * 3) * 0.25);
  },
  remove() {
    this.el.removeEventListener('mouseenter', this.onEnter);
    this.el.removeEventListener('mouseleave', this.onLeave);
    this.el.removeEventListener('click', this.onClick);
  }
});

/* =========================================================================
   billboard - always face the camera (labels, halos, speech bubbles)
   ========================================================================= */
AFRAME.registerComponent('billboard', {
  init() { this.target = new THREE.Vector3(); },
  tick() {
    const cam = this.el.sceneEl.camera;
    if (!cam || !this.el.object3D.parent) return;
    cam.getWorldPosition(this.target);
    this.el.object3D.parent.worldToLocal(this.target);
    this.el.object3D.lookAt(this.target);
  }
});

/* =========================================================================
   alert-light - rotating warning beacon (used in the server room)
   ========================================================================= */
AFRAME.registerComponent('alert-light', {
  schema: { color: { type: 'color', default: '#ff4d5e' }, speed: { type: 'number', default: 2.2 }, on: { type: 'boolean', default: true } },
  init() {
    this.light = document.createElement('a-entity');
    this.light.setAttribute('light', `type: point; color: ${this.data.color}; intensity: 0; distance: 9; decay: 2`);
    this.el.appendChild(this.light);
  },
  tick(time) {
    if (!this.data.on) { this.light.setAttribute('light', 'intensity', 0); return; }
    const t = time / 1000;
    const sweep = settings.reduceMotion ? 0.6 : Math.pow(Math.max(0, Math.sin(t * this.data.speed)), 3);
    this.light.setAttribute('light', 'intensity', 0.4 + sweep * 2.6);
    const mesh = this.el.getObject3D('mesh');
    if (mesh && mesh.material) {
      mesh.material.emissiveIntensity = 0.3 + sweep * 2.2;
      mesh.material.opacity = 0.55 + sweep * 0.4;
    }
    if (!settings.reduceMotion) this.el.object3D.rotation.y = t * this.data.speed;
  }
});

/* =========================================================================
   bob / spin - tiny idle animations, disabled when "reduce motion" is on
   ========================================================================= */
AFRAME.registerComponent('bob', {
  schema: { amp: { type: 'number', default: 0.05 }, speed: { type: 'number', default: 1.6 }, phase: { type: 'number', default: 0 } },
  init() { this.baseY = this.el.object3D.position.y; },
  tick(time) {
    if (settings.reduceMotion) { this.el.object3D.position.y = this.baseY; return; }
    this.el.object3D.position.y = this.baseY + Math.sin(time / 1000 * this.data.speed + this.data.phase) * this.data.amp;
  }
});

AFRAME.registerComponent('slow-spin', {
  schema: { speed: { type: 'number', default: 0.4 } },
  tick(time) {
    if (settings.reduceMotion) return;
    this.el.object3D.rotation.y = (time / 1000) * this.data.speed;
  }
});

/* =========================================================================
   security-cam - slowly panning camera housing with a red record LED
   ========================================================================= */
AFRAME.registerComponent('security-cam', {
  schema: { range: { type: 'number', default: 0.6 }, speed: { type: 'number', default: 0.5 } },
  tick(time) {
    if (settings.reduceMotion) return;
    this.el.object3D.rotation.y = Math.sin(time / 1000 * this.data.speed) * this.data.range;
  }
});

/* =========================================================================
   player-bounds - keeps the player inside the walls of the current area
   ========================================================================= */
AFRAME.registerComponent('player-bounds', {
  tick() {
    const origin = CONFIG.areaOrigin[state.area];
    if (!origin) return;
    const p = this.el.object3D.position;
    const bx = CONFIG.roomBounds.x, bz = CONFIG.roomBounds.z;
    p.x = Math.min(origin.x + bx, Math.max(origin.x - bx, p.x));
    p.z = Math.min(origin.z + bz, Math.max(origin.z - bz, p.z));
    p.y = 0;
  }
});

/* =========================================================================
   player-head - very subtle head bob while walking (comfort-safe, optional)
   ========================================================================= */
AFRAME.registerComponent('player-head', {
  init() {
    this.base = this.el.object3D.position.y;
    this.prev = new THREE.Vector3();
    this.rig = this.el.parentElement;
  },
  tick(time) {
    if (settings.reduceMotion) { this.el.object3D.position.y = this.base; return; }
    const p = this.rig.object3D.position;
    const moved = p.distanceTo(this.prev);
    this.prev.copy(p);
    const amount = Math.min(moved * 14, 1);
    this.el.object3D.position.y = this.base + Math.sin(time / 1000 * 9) * 0.022 * amount;
  }
});

/* =========================================================================
   npc - a fictional adult staff member built from simple primitives.
   No faces, no real people: stylised hi-vis figures with a name tag.
   ========================================================================= */
AFRAME.registerComponent('npc', {
  schema: {
    name: { type: 'string', default: 'Staff' },
    role: { type: 'string', default: 'Warehouse team' },
    vest: { type: 'color', default: '#ffb020' },
    skin: { type: 'color', default: '#b98a63' },
    helmet: { type: 'color', default: '#e8eef6' },
    phase: { type: 'number', default: 0 }
  },
  init() {
    const d = this.data;
    const add = (tag, attrs) => {
      const e = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
      this.el.appendChild(e);
      return e;
    };

    // Legs
    add('a-box', { position: '-0.11 0.38 0', width: 0.17, height: 0.76, depth: 0.19, material: 'color: #223047; roughness: 0.9' });
    add('a-box', { position: '0.11 0.38 0', width: 0.17, height: 0.76, depth: 0.19, material: 'color: #223047; roughness: 0.9' });
    // Boots
    add('a-box', { position: '-0.11 0.05 0.03', width: 0.19, height: 0.11, depth: 0.27, material: 'color: #11161f' });
    add('a-box', { position: '0.11 0.05 0.03', width: 0.19, height: 0.11, depth: 0.27, material: 'color: #11161f' });
    // Torso + hi-vis vest
    add('a-box', { position: '0 1.05 0', width: 0.46, height: 0.62, depth: 0.25, material: `color: ${d.vest}; roughness: 0.55; metalness: 0.05` });
    add('a-box', { position: '0 1.12 0.132', width: 0.4, height: 0.07, depth: 0.01, material: 'color: #e8f1ff; emissive: #93b7d6; emissiveIntensity: 0.5' });
    add('a-box', { position: '0 0.95 0.132', width: 0.4, height: 0.07, depth: 0.01, material: 'color: #e8f1ff; emissive: #93b7d6; emissiveIntensity: 0.5' });
    // Arms
    this.armL = add('a-box', { position: '-0.3 1.02 0', width: 0.13, height: 0.58, depth: 0.15, material: `color: ${d.vest}; roughness: 0.6` });
    this.armR = add('a-box', { position: '0.3 1.02 0', width: 0.13, height: 0.58, depth: 0.15, material: `color: ${d.vest}; roughness: 0.6` });
    // Head + helmet (no facial features - these are stylised, fictional staff)
    add('a-sphere', { position: '0 1.5 0', radius: 0.145, material: `color: ${d.skin}; roughness: 0.85` });
    add('a-sphere', { position: '0 1.55 0', radius: 0.17, 'theta-length': 92, material: `color: ${d.helmet}; roughness: 0.4; metalness: 0.1` });
    add('a-box', { position: '0 1.52 0.15', width: 0.3, height: 0.03, depth: 0.13, material: `color: ${d.helmet}` });

    // Name tag
    const tag = document.createElement('a-plane');
    tag.setAttribute('position', '0 2.05 0');
    tag.setAttribute('width', 1.25);
    tag.setAttribute('height', 0.36);
    tag.setAttribute('material', 'shader: flat; transparent: true; side: double');
    tag.setAttribute('billboard', '');
    this.el.appendChild(tag);
    whenMesh(tag, (mesh) => {
      const canvas = TEX.signCanvas(d.name, d.role, '#7ef7ff', 'rgba(7,13,26,0.94)');
      const t = new THREE.CanvasTexture(canvas);
      if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
      mesh.material.map = t;
      mesh.material.needsUpdate = true;
    });

    // Speech bubble (hidden until the NPC speaks)
    this.bubble = document.createElement('a-plane');
    this.bubble.setAttribute('position', '0 2.5 0');
    this.bubble.setAttribute('width', 2.6);
    this.bubble.setAttribute('height', 0.8);
    this.bubble.setAttribute('visible', false);
    this.bubble.setAttribute('material', 'shader: flat; transparent: true; side: double');
    this.bubble.setAttribute('billboard', '');
    this.el.appendChild(this.bubble);

    this.pointing = false;
    this.baseY = this.el.object3D.position.y;
  },
  /** Show a short line above the NPC's head for `ms` milliseconds. */
  say(text, ms = 7000) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 300;
    const g = canvas.getContext('2d');
    g.fillStyle = 'rgba(7,13,26,0.94)';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.strokeStyle = '#ffb020'; g.lineWidth = 8;
    g.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    g.fillStyle = '#ffe6b8'; g.font = '38px "Segoe UI", sans-serif'; g.textAlign = 'center';
    const words = String(text).split(' ');
    let line = '', y = 90;
    words.forEach((word) => {
      const test = line + word + ' ';
      if (g.measureText(test).width > canvas.width - 90 && line) {
        g.fillText(line.trim(), canvas.width / 2, y); line = word + ' '; y += 50;
      } else line = test;
    });
    g.fillText(line.trim(), canvas.width / 2, y);

    whenMesh(this.bubble, (mesh) => {
      const t = new THREE.CanvasTexture(canvas);
      if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
      mesh.material.map = t;
      mesh.material.needsUpdate = true;
    });
    this.bubble.setAttribute('visible', true);
    clearTimeout(this._bubbleTimer);
    this._bubbleTimer = setTimeout(() => this.bubble.setAttribute('visible', false), ms);
    this.pointing = true;
    clearTimeout(this._pointTimer);
    this._pointTimer = setTimeout(() => { this.pointing = false; }, ms);
  },
  tick(time) {
    const t = time / 1000 + this.data.phase;
    if (!settings.reduceMotion) {
      // gentle idle breathing
      this.el.object3D.position.y = this.baseY + Math.sin(t * 1.1) * 0.018;
      this.armL.object3D.rotation.x = Math.sin(t * 1.1) * 0.12;
      this.armR.object3D.rotation.x = -Math.sin(t * 1.1) * 0.12;
    }
    // "pointing at the problem" gesture while speaking
    const target = this.pointing ? -1.35 : (settings.reduceMotion ? 0 : this.armR.object3D.rotation.x);
    if (this.pointing) this.armR.object3D.rotation.x += (target - this.armR.object3D.rotation.x) * 0.12;
  }
});

/* =========================================================================
   blink-led - small status light that blinks on its own rhythm
   ========================================================================= */
AFRAME.registerComponent('blink-led', {
  schema: { speed: { type: 'number', default: 2 }, phase: { type: 'number', default: 0 } },
  tick(time) {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh || !mesh.material) return;
    const v = settings.reduceMotion ? 0.8 : 0.25 + 0.75 * Math.abs(Math.sin(time / 1000 * this.data.speed + this.data.phase));
    mesh.material.emissiveIntensity = v * 2;
  }
});

export function componentsReady() { return true; }

/* =========================================================================
   sign - paints a text sign onto a plane (door labels, notices, posters)
   ========================================================================= */
AFRAME.registerComponent('sign', {
  schema: {
    text: { type: 'string', default: '' },
    sub: { type: 'string', default: '' },
    color: { type: 'color', default: '#55e9ff' },
    bg: { type: 'color', default: '#0b1526' }
  },
  init() {
    const canvas = TEX.signCanvas(this.data.text, this.data.sub, this.data.color, this.data.bg);
    const texture = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in texture) texture.colorSpace = THREE.SRGBColorSpace;
    whenMesh(this.el, (mesh) => {
      mesh.material.map = texture;
      if (mesh.material.emissive) {
        mesh.material.emissiveMap = texture;
        mesh.material.emissive.set('#ffffff');
        mesh.material.emissiveIntensity = 0.35;
      }
      mesh.material.needsUpdate = true;
    });
  }
});
