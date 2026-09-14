/* Minimal A-Frame stand-in used ONLY by tests/dom-smoke.mjs.
   It is enough to register components, run their init/update and let the
   real game code build the world and drive the UI in a headless browser. */
(function () {
  const registry = {};

  function makeVec(x, y, z) {
    return {
      x: x || 0, y: y || 0, z: z || 0,
      set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; },
      copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; },
      clone() { return makeVec(this.x, this.y, this.z); },
      multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; },
      setScalar(s) { this.x = this.y = this.z = s; return this; },
      distanceTo() { return 0; },
      lookAt() {}
    };
  }

  function fakeMesh() {
    return {
      raycast() {},
      material: {
        map: null, emissiveMap: null, emissiveIntensity: 1, opacity: 1,
        needsUpdate: false, color: { set() {} }, emissive: { set() {} }
      }
    };
  }

  function parseValue(v) {
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v !== '' && !isNaN(Number(v))) return Number(v);
    if (/^-?[\d.]+ -?[\d.]+ -?[\d.]+$/.test(v)) {
      const p = v.split(/\s+/).map(Number);
      return { x: p[0], y: p[1], z: p[2] };
    }
    return v;
  }

  function parseAttr(str) {
    const out = {};
    String(str).split(';').forEach((pair) => {
      const i = pair.indexOf(':');
      if (i < 0) return;
      const k = pair.slice(0, i).trim();
      if (k) out[k] = parseValue(pair.slice(i + 1).trim());
    });
    return out;
  }

  function defaults(def) {
    const d = {};
    const schema = def.schema || {};
    Object.entries(schema).forEach(([k, s]) => { d[k] = s && 'default' in s ? s.default : ''; });
    return d;
  }

  class AEl extends HTMLElement {
    constructor() {
      super();
      this.object3D = {
        position: makeVec(0, 0, 0), rotation: makeVec(0, 0, 0),
        scale: makeVec(1, 1, 1), parent: null, visible: true,
        lookAt() {}, getWorldPosition(v) { return v; }, worldToLocal(v) { return v; }
      };
      this.components = {};
      this._mesh = fakeMesh();
      this.hasLoaded = true;
    }
    get sceneEl() { return document.querySelector('a-scene'); }
    getObject3D() { return this._mesh; }
    setObject3D() {}
    emit(name, detail, bubbles) {
      this.dispatchEvent(new CustomEvent(name, { detail: detail || null, bubbles: bubbles !== false }));
    }
    setAttribute(name, a, b) {
      const def = registry[name];
      if (!def) { super.setAttribute(name, a === undefined ? '' : (typeof a === 'object' ? JSON.stringify(a) : a)); return; }
      let comp = this.components[name];
      if (!comp) {
        comp = Object.assign({}, def);
        comp.el = this;
        comp.data = defaults(def);
        this.components[name] = comp;
        const raw = typeof a === 'object' && b === undefined ? a : (b === undefined ? parseAttr(a) : { [a]: b });
        Object.assign(comp.data, raw);
        super.setAttribute(name, '');
        if (def.init) def.init.call(comp);
        if (def.update) def.update.call(comp, {});
      } else {
        const raw = b === undefined ? (typeof a === 'object' ? a : parseAttr(a)) : { [a]: b };
        Object.assign(comp.data, raw);
        if (def.update) def.update.call(comp, {});
      }
    }
  }

  ['a-scene', 'a-entity', 'a-plane', 'a-box', 'a-sphere', 'a-cylinder', 'a-sky',
   'a-assets', 'a-cursor', 'a-camera', 'a-ring', 'a-circle', 'a-text'].forEach((tag) => {
    customElements.define(tag, class extends AEl {});
  });

  class CanvasTexture { constructor(img) { this.image = img; this.repeat = { set() {} }; this.needsUpdate = false; } }

  window.AFRAME = {
    registerComponent(name, def) { registry[name] = def; },
    components: registry,
    THREE: {
      CanvasTexture,
      RepeatWrapping: 1000,
      SRGBColorSpace: 'srgb',
      Vector3: function () { return makeVec(0, 0, 0); }
    }
  };
  window.__AFRAME_SHIM__ = true;
})();
