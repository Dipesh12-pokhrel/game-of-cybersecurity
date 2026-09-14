/**
 * state.js
 * The single source of truth for the simulation.
 *
 * Everything that changes during play lives here. UI modules subscribe with
 * `state.on(event, handler)` and never mutate the object directly - they call
 * the small set of methods below. That keeps scoring rules (especially
 * "a mission may only ever be scored once") in one auditable place.
 */

import { CONFIG } from './config.js';

/** Very small event emitter so the HUD can react to state changes. */
class Emitter {
  constructor() { this.handlers = new Map(); }
  on(evt, fn) {
    if (!this.handlers.has(evt)) this.handlers.set(evt, new Set());
    this.handlers.get(evt).add(fn);
    return () => this.handlers.get(evt).delete(fn);
  }
  emit(evt, payload) {
    const set = this.handlers.get(evt);
    if (set) set.forEach((fn) => fn(payload));
  }
}

export const bus = new Emitter();

/** Default, restartable game state. */
function freshState() {
  return {
    phase: 'boot',            // boot | briefing | playing | lockdown | quiz | ended
    running: false,           // is the clock ticking?
    paused: false,
    points: 0,
    attack: 0,                // 0 - 100
    threatsStopped: 0,
    timeLeft: CONFIG.missionTime,
    lockdownLeft: CONFIG.lockdownTime,
    area: 'office',
    missionIndex: 0,          // index into MISSIONS
    /** Per-mission record: { status: 'pending'|'done'|'failed', earned, attempts } */
    missions: {},
    /** ids of the three hidden threats found during the finale */
    huntFound: [],
    quizIndex: 0,
    quizCorrect: 0,
    /** Debrief lines collected as the player makes decisions. */
    debrief: [],
    endReason: null,          // 'complete' | 'breach' | 'timeout'
    startedAt: 0
  };
}

export const state = freshState();

/* -------------------------------------------------------------------------
   Settings (persisted)
   ------------------------------------------------------------------------- */

const defaultSettings = {
  audio: true,
  reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  highContrast: false,
  reducePressure: false,   // turns off the passive attack-meter drift
  subtitles: true
};

export const settings = Object.assign({}, defaultSettings, readSettings());

function readSettings() {
  try {
    const raw = localStorage.getItem(CONFIG.settingsKey);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('[CDHDV] Could not read settings:', err);
    return {};
  }
}

export function saveSettings() {
  try {
    localStorage.setItem(CONFIG.settingsKey, JSON.stringify(settings));
  } catch (err) {
    console.warn('[CDHDV] Could not save settings:', err);
  }
  applySettingsToBody();
  bus.emit('settings', settings);
}

export function applySettingsToBody() {
  document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
  document.body.classList.toggle('high-contrast', !!settings.highContrast);
}

/* -------------------------------------------------------------------------
   Best score (persisted)
   ------------------------------------------------------------------------- */

export function readBest() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[CDHDV] Could not read best score:', err);
    return null;
  }
}

export function writeBest(record) {
  const current = readBest();
  if (current && current.points >= record.points) return current;
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(record));
  } catch (err) {
    console.warn('[CDHDV] Could not save best score:', err);
  }
  return record;
}

/* -------------------------------------------------------------------------
   Mutations
   ------------------------------------------------------------------------- */

export function resetState() {
  Object.assign(state, freshState());
  bus.emit('reset', state);
  bus.emit('stats', state);
}

/** Award (or deduct) defence points. Emits a score pop. */
export function addPoints(amount, label) {
  state.points = Math.max(0, state.points + amount);
  bus.emit('points', { amount, label, total: state.points });
  bus.emit('stats', state);
}

/** Push the attack meter up (or down for `amount` < 0). */
export function addAttack(amount, reason) {
  const before = state.attack;
  state.attack = Math.min(CONFIG.attackMax, Math.max(0, state.attack + amount));
  if (state.attack !== before) bus.emit('attack', { amount, reason, total: state.attack });
  bus.emit('stats', state);
  if (state.attack >= CONFIG.attackMax && state.phase !== 'ended') {
    bus.emit('gameover', { reason: 'breach' });
  }
}

export function markThreatStopped() {
  state.threatsStopped = Math.min(CONFIG.totalThreats, state.threatsStopped + 1);
  bus.emit('stats', state);
}

/** Records a debrief line shown on the results screen. */
export function addDebrief(ok, title, text) {
  state.debrief.push({ ok, title, text });
}

/**
 * Returns the stored record for a mission, creating it on first access.
 * `status` starts as 'pending'.
 */
export function missionRecord(id) {
  if (!state.missions[id]) {
    state.missions[id] = { status: 'pending', earned: 0, attempts: 0, evidence: [] };
  }
  return state.missions[id];
}

/** A mission is "resolved" once it has been answered - right or wrong. */
export function isMissionResolved(id) {
  const rec = state.missions[id];
  return !!rec && rec.status !== 'pending';
}

export function setArea(areaId) {
  if (state.area === areaId) return;
  state.area = areaId;
  bus.emit('area', areaId);
}

export function setPhase(phase) {
  state.phase = phase;
  bus.emit('phase', phase);
}

/* -------------------------------------------------------------------------
   Clock
   ------------------------------------------------------------------------- */

let lastTick = 0;
let rafId = 0;

function tick(now) {
  rafId = requestAnimationFrame(tick);
  if (!lastTick) lastTick = now;
  const dt = Math.min(0.25, (now - lastTick) / 1000); // clamp after tab switches
  lastTick = now;

  if (!state.running || state.paused) return;

  if (state.phase === 'playing') {
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    if (!settings.reducePressure) {
      const before = state.attack;
      state.attack = Math.min(CONFIG.attackMax, state.attack + CONFIG.attackDriftPerSecond * dt);
      if (Math.floor(before) !== Math.floor(state.attack)) bus.emit('attack', { amount: 0, reason: 'drift', total: state.attack });
    }
    bus.emit('stats', state);
    if (state.timeLeft <= 0) { bus.emit('gameover', { reason: 'timeout' }); return; }
    if (state.attack >= CONFIG.attackMax) { bus.emit('gameover', { reason: 'breach' }); return; }
  } else if (state.phase === 'lockdown') {
    state.lockdownLeft = Math.max(0, state.lockdownLeft - dt);
    bus.emit('stats', state);
    if (state.lockdownLeft <= 0) bus.emit('lockdown-timeout');
  }
}

export function startClock() {
  if (!rafId) { lastTick = 0; rafId = requestAnimationFrame(tick); }
}

export function stopClock() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
}

/** Pause / resume. Returns the new paused value. */
export function setPaused(value) {
  state.paused = value;
  document.body.classList.toggle('is-paused', value);
  bus.emit('paused', value);
  return value;
}
