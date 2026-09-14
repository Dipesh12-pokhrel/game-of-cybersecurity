/**
 * audio.js
 * All sound is synthesised with the Web Audio API - there are no audio files
 * to ship or license. Every cue that carries meaning is also written to the
 * subtitle bar so the game is fully playable with sound off.
 */

import { settings, bus } from './state.js';

let ctx = null;
let master = null;
let ambientNodes = [];
let alertOsc = null;

/** Lazily create the audio context (browsers require a user gesture first). */
function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = settings.audio ? 0.5 : 0;
  master.connect(ctx.destination);
  return ctx;
}

export function resumeAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume();
}

export function setAudioEnabled(on) {
  settings.audio = on;
  if (master) master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.05);
}

/* ------------------------------------------------------------------ */
/* One-shot cues                                                      */
/* ------------------------------------------------------------------ */

function tone({ freq = 440, type = 'sine', dur = 0.18, gain = 0.25, slide = 0, delay = 0 }) {
  const c = ensureContext();
  if (!c || !settings.audio) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

function noiseBurst({ dur = 0.3, gain = 0.18, lp = 1800 }) {
  const c = ensureContext();
  if (!c || !settings.audio) return;
  const frames = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = lp;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(filter); filter.connect(g); g.connect(master);
  src.start();
}

export const sfx = {
  hover() { tone({ freq: 880, type: 'sine', dur: 0.06, gain: 0.06 }); },
  select() { tone({ freq: 520, type: 'triangle', dur: 0.1, gain: 0.16, slide: 240 }); },
  correct() {
    tone({ freq: 523.25, type: 'triangle', dur: 0.16, gain: 0.2 });
    tone({ freq: 659.25, type: 'triangle', dur: 0.18, gain: 0.2, delay: 0.11 });
    tone({ freq: 783.99, type: 'triangle', dur: 0.34, gain: 0.22, delay: 0.22 });
  },
  wrong() {
    tone({ freq: 196, type: 'sawtooth', dur: 0.28, gain: 0.18, slide: -80 });
    tone({ freq: 130, type: 'square', dur: 0.36, gain: 0.12, delay: 0.06 });
  },
  alarm() {
    tone({ freq: 740, type: 'square', dur: 0.22, gain: 0.14 });
    tone({ freq: 560, type: 'square', dur: 0.22, gain: 0.14, delay: 0.24 });
  },
  score() { tone({ freq: 1046, type: 'sine', dur: 0.12, gain: 0.14, slide: 300 }); },
  teleport() { noiseBurst({ dur: 0.36, gain: 0.1, lp: 900 }); tone({ freq: 160, type: 'sine', dur: 0.4, gain: 0.1, slide: 420 }); },
  phantom() {
    noiseBurst({ dur: 0.5, gain: 0.12, lp: 700 });
    tone({ freq: 92, type: 'sawtooth', dur: 0.7, gain: 0.12, slide: -30 });
  },
  victory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.4, gain: 0.2, delay: i * 0.13 }));
  },
  breach() {
    [330, 262, 196, 147].forEach((f, i) => tone({ freq: f, type: 'sawtooth', dur: 0.45, gain: 0.16, delay: i * 0.16 }));
  },
  tick() { tone({ freq: 1200, type: 'square', dur: 0.03, gain: 0.05 }); }
};

/* ------------------------------------------------------------------ */
/* Ambience                                                           */
/* ------------------------------------------------------------------ */

/** Continuous warehouse hum: filtered noise + two low drones. */
export function startAmbience() {
  const c = ensureContext();
  if (!c || ambientNodes.length) return;

  // Air-handling noise bed
  const frames = c.sampleRate * 2;
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  noise.buffer = buffer; noise.loop = true;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
  const ng = c.createGain(); ng.gain.value = 0.05;
  noise.connect(lp); lp.connect(ng); ng.connect(master);
  noise.start();
  ambientNodes.push(noise, ng);

  // Two quiet drones for the "command centre" feel
  [55, 82.4].forEach((f, i) => {
    const osc = c.createOscillator();
    osc.type = 'sine'; osc.frequency.value = f;
    const g = c.createGain(); g.gain.value = 0.035 - i * 0.012;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07 + i * 0.05;
    const lfoGain = c.createGain(); lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    osc.connect(g); g.connect(master);
    osc.start(); lfo.start();
    ambientNodes.push(osc, lfo, g);
  });
}

export function stopAmbience() {
  ambientNodes.forEach((n) => { try { n.stop && n.stop(); n.disconnect(); } catch (e) { /* already stopped */ } });
  ambientNodes = [];
  stopAlertTone();
}

/** Rising alert drone tied to the attack meter. */
export function setAlertLevel(level01) {
  const c = ensureContext();
  if (!c) return;
  if (level01 > 0.7) {
    if (!alertOsc) {
      alertOsc = { osc: c.createOscillator(), gain: c.createGain(), lfo: c.createOscillator(), lfoGain: c.createGain() };
      alertOsc.osc.type = 'sawtooth';
      alertOsc.osc.frequency.value = 110;
      alertOsc.gain.gain.value = 0;
      alertOsc.lfo.frequency.value = 5;
      alertOsc.lfoGain.gain.value = 14;
      alertOsc.lfo.connect(alertOsc.lfoGain);
      alertOsc.lfoGain.connect(alertOsc.osc.frequency);
      alertOsc.osc.connect(alertOsc.gain);
      alertOsc.gain.connect(master);
      alertOsc.osc.start(); alertOsc.lfo.start();
    }
    alertOsc.gain.gain.setTargetAtTime((level01 - 0.7) * 0.14, c.currentTime, 0.4);
  } else if (alertOsc) {
    alertOsc.gain.gain.setTargetAtTime(0, c.currentTime, 0.3);
  }
}

function stopAlertTone() {
  if (!alertOsc) return;
  try { alertOsc.osc.stop(); alertOsc.lfo.stop(); } catch (e) { /* noop */ }
  alertOsc = null;
}

/* ------------------------------------------------------------------ */
/* Subtitles - every meaningful sound has a caption                    */
/* ------------------------------------------------------------------ */

let subtitleTimer = 0;

/**
 * Show a caption. `speaker` is used for styling ('phantom' turns it red).
 * Captions appear even when audio is muted, which is what makes the game
 * fully usable without sound.
 */
export function subtitle(text, speaker = '', ms = 5200) {
  const bar = document.getElementById('subtitles');
  if (!bar) return;
  if (!settings.subtitles) { bar.innerHTML = ''; return; }
  bar.className = 'subtitles' + (speaker ? ' speaker-' + speaker : '');
  bar.innerHTML = `<span>${text}</span>`;
  clearTimeout(subtitleTimer);
  subtitleTimer = setTimeout(() => { bar.innerHTML = ''; }, ms);
}

/** Keep the alert drone in step with the attack meter. */
bus.on('stats', (s) => setAlertLevel(s.attack / 100));
