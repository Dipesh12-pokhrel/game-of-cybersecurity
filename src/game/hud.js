/**
 * hud.js
 * Everything drawn on top of the 3D view: score, attack meter, timer,
 * mission panel, crosshair, area navigation, toasts and score pops.
 *
 * The HUD only ever READS state - it never changes the score itself.
 */

import { CONFIG, AREA_NAME } from './config.js';
import { state, bus, settings } from './state.js';
import { MISSIONS } from './missions.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);

let els = {};

export function initHud({ onArea, onPause, onAudio, onHelp }) {
  els = {
    points: $('statPoints'),
    threats: $('statThreats'),
    timer: $('statTimer'),
    timerBox: $('statTimer').parentElement,
    meterFill: $('meterFill'),
    meterValue: $('meterValue'),
    meterTrack: $('meterTrack'),
    chip: $('missionChip'),
    title: $('missionTitle'),
    objective: $('missionObjective'),
    location: $('missionLocation'),
    progress: $('missionProgress'),
    panel: $('missionPanel'),
    navList: $('areaNavList'),
    crosshair: $('crosshair'),
    crossLabel: $('crosshairLabel'),
    toasts: $('toastStack'),
    hud: $('hud')
  };

  // --- Area navigation buttons -------------------------------------
  CONFIG.areas.forEach((area) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'area-btn';
    btn.dataset.area = area.id;
    btn.innerHTML = `<span class="area-icon" aria-hidden="true">${area.icon}</span><span>${area.name}</span>`;
    btn.addEventListener('click', () => onArea(area.id));
    els.navList.appendChild(btn);
  });

  // --- Top-bar buttons ---------------------------------------------
  $('btnPause').addEventListener('click', onPause);
  $('btnAudio').addEventListener('click', onAudio);
  $('btnHelp').addEventListener('click', onHelp);

  // --- Collapse mission panel --------------------------------------
  $('btnCollapse').addEventListener('click', (e) => {
    const collapsed = els.panel.classList.toggle('is-collapsed');
    e.currentTarget.setAttribute('aria-expanded', String(!collapsed));
  });

  // --- Crosshair hover feedback ------------------------------------
  const scene = $('scene');
  scene.addEventListener('hotspot-hover', (evt) => {
    const { on, label } = evt.detail;
    els.crosshair.classList.toggle('is-hot', !!on);
    els.crossLabel.textContent = on ? (label || '') : '';
    if (on) sfx.hover();
  });

  // --- React to state ----------------------------------------------
  bus.on('stats', renderStats);
  bus.on('points', ({ amount }) => { if (amount) scorePop(amount); });
  bus.on('area', renderArea);

  renderStats(state);
  renderArea(state.area);
  detectTouch();
}

/* ------------------------------------------------------------------ */
/* Stats                                                              */
/* ------------------------------------------------------------------ */

let lastPoints = 0;
let lastWholeSecond = -1;

function renderStats(s) {
  if (!els.points) return;

  if (s.points !== lastPoints) {
    els.points.textContent = s.points;
    bump(els.points);
    lastPoints = s.points;
  }
  els.threats.textContent = `${s.threatsStopped} / ${CONFIG.totalThreats}`;

  const secondsLeft = s.phase === 'lockdown' ? s.lockdownLeft : s.timeLeft;
  const whole = Math.ceil(secondsLeft);
  if (whole !== lastWholeSecond) {
    lastWholeSecond = whole;
    els.timer.textContent = formatTime(secondsLeft);
    const urgent = secondsLeft <= 60;
    els.timerBox.classList.toggle('is-urgent', urgent);
    if (urgent && whole <= 10 && whole > 0 && s.running && !s.paused) sfx.tick();
  }

  const pct = Math.round(s.attack);
  els.meterFill.style.width = `${s.attack}%`;
  els.meterValue.textContent = `${pct}%`;
  els.meterTrack.setAttribute('aria-valuenow', String(pct));
  els.meterTrack.classList.toggle('is-critical', pct >= CONFIG.alertThreshold);
  document.body.classList.toggle('alert-high', pct >= CONFIG.alertThreshold);
}

function formatTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function bump(el) {
  if (settings.reduceMotion) return;
  el.classList.remove('bump');
  void el.offsetWidth;       // restart the animation
  el.classList.add('bump');
}

/* ------------------------------------------------------------------ */
/* Mission panel                                                      */
/* ------------------------------------------------------------------ */

export function renderMission(mission, overrides) {
  if (!els.chip) return;
  const o = overrides || {};
  els.chip.textContent = o.chip || (mission ? `MISSION ${mission.number}` : 'FINAL');
  els.title.textContent = o.title || (mission ? mission.title : '');
  els.objective.textContent = o.objective || (mission ? mission.objective : '');
  const areaId = o.area || (mission ? mission.area : state.area);
  els.location.innerHTML = `<span aria-hidden="true">\u{1F4CD}</span> ${AREA_NAME[areaId] || ''}`;

  // Mission checklist
  els.progress.innerHTML = '';
  MISSIONS.forEach((m) => {
    const rec = state.missions[m.id];
    const li = document.createElement('li');
    const status = rec ? rec.status : 'pending';
    if (status === 'done') li.className = 'done';
    else if (status === 'failed') li.className = 'failed';
    else if (mission && m.id === mission.id) li.className = 'active';
    li.innerHTML = `<span class="dot" aria-hidden="true"></span><span>${m.number}. ${m.title}</span>`;
    els.progress.appendChild(li);
  });

  highlightObjectiveArea(areaId);
}

function highlightObjectiveArea(areaId) {
  els.navList.querySelectorAll('.area-btn').forEach((btn) => {
    btn.classList.toggle('has-objective', btn.dataset.area === areaId && btn.dataset.area !== state.area);
  });
}

function renderArea(areaId) {
  els.navList.querySelectorAll('.area-btn').forEach((btn) => {
    btn.classList.toggle('is-current', btn.dataset.area === areaId);
  });
}

/* ------------------------------------------------------------------ */
/* Toasts and score pops                                              */
/* ------------------------------------------------------------------ */

/** Maximum toasts on screen at once - more than this buries the HUD. */
const MAX_TOASTS = 3;

export function toast(message, kind = 'info', ms = 4200) {
  if (!els.toasts) return;

  // Retire the oldest toasts so the stack can never grow over the mission panel.
  const live = els.toasts.querySelectorAll('.toast:not(.is-out)');
  for (let i = 0; i <= live.length - MAX_TOASTS; i++) {
    live[i].classList.add('is-out');
    setTimeout(() => live[i].remove(), 400);
  }

  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  els.toasts.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 400);
  }, ms);
}

export function scorePop(amount) {
  const el = document.createElement('div');
  el.className = 'score-pop' + (amount < 0 ? ' bad' : '');
  el.textContent = `${amount > 0 ? '+' : ''}${amount}`;
  els.hud.appendChild(el);
  sfx.score();
  setTimeout(() => el.remove(), 1300);
}

/* ------------------------------------------------------------------ */
/* Final-battle hotspot tracker                                       */
/* ------------------------------------------------------------------ */

let huntEl = null;

export function showHuntTracker(total) {
  hideHuntTracker();
  huntEl = document.createElement('div');
  huntEl.className = 'hunt-tracker';
  huntEl.innerHTML = `<span>Threats remaining</span>
    <span class="hunt-dots">${Array.from({ length: total }, () => '<span></span>').join('')}</span>
    <span class="hunt-time" id="huntTime">60</span>`;
  els.hud.appendChild(huntEl);
}

export function updateHuntTracker(found, secondsLeft) {
  if (!huntEl) return;
  huntEl.querySelectorAll('.hunt-dots span').forEach((dot, i) => dot.classList.toggle('hit', i < found));
  const time = huntEl.querySelector('#huntTime');
  if (time) time.textContent = String(Math.max(0, Math.ceil(secondsLeft)));
}

export function hideHuntTracker() {
  if (huntEl) { huntEl.remove(); huntEl = null; }
}

/* ------------------------------------------------------------------ */
/* Touch controls                                                     */
/* ------------------------------------------------------------------ */

function detectTouch() {
  const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  document.body.classList.toggle('is-touch', isTouch);
  if (!isTouch) return;

  const stick = $('touchStick');
  const knob = $('touchKnob');
  const action = $('touchAction');
  const camera = $('camera');
  let active = false, originX = 0, originY = 0;

  /** Feed the virtual stick into A-Frame's wasd-controls key state. */
  const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
  function setKey(code, down) {
    if (keys[code] === down) return;
    keys[code] = down;
    const wasd = camera && camera.components['wasd-controls'];
    if (!wasd) return;
    if (down) wasd.keys[code] = true;
    else delete wasd.keys[code];
  }

  const onStart = (e) => {
    active = true;
    const t = e.touches ? e.touches[0] : e;
    const rect = stick.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!active) return;
    const t = e.touches ? e.touches[0] : e;
    let dx = t.clientX - originX;
    let dy = t.clientY - originY;
    const max = 44;
    const len = Math.hypot(dx, dy) || 1;
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    setKey('KeyW', dy < -14);
    setKey('KeyS', dy > 14);
    setKey('KeyA', dx < -14);
    setKey('KeyD', dx > 14);
    e.preventDefault();
  };
  const onEnd = () => {
    active = false;
    knob.style.transform = '';
    Object.keys(keys).forEach((k) => setKey(k, false));
  };

  stick.addEventListener('touchstart', onStart, { passive: false });
  stick.addEventListener('touchmove', onMove, { passive: false });
  stick.addEventListener('touchend', onEnd);
  stick.addEventListener('touchcancel', onEnd);

  // The SELECT button clicks whatever the crosshair is pointing at
  action.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const cursor = $('cursor');
    const raycaster = cursor && cursor.components.raycaster;
    const hit = raycaster && raycaster.intersectedEls && raycaster.intersectedEls[0];
    if (hit) hit.emit('click', null, false);
  }, { passive: false });
}

export function setAudioButtonState(on) {
  const btn = $('btnAudio');
  const glyph = $('audioGlyph');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(!on));
  btn.setAttribute('aria-label', on ? 'Mute audio' : 'Unmute audio');
  glyph.innerHTML = on ? '&#128266;' : '&#128263;';
}
