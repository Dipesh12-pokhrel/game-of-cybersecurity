/**
 * game.js
 * The orchestrator: mission flow, scoring, navigation between areas,
 * pause / settings, and the end screens.
 *
 * Scoring rules live in exactly one place (`finishMission`) so a mission can
 * never be completed or scored twice.
 */

import { CONFIG, AREA_NAME } from './config.js';
import {
  state, settings, bus, resetState, addPoints, addAttack, markThreatStopped,
  addDebrief, missionRecord, isMissionResolved, setArea, setPhase,
  startClock, setPaused, saveSettings, readBest, writeBest, applySettingsToBody
} from './state.js';
import { MISSIONS, HUNT_TARGETS, PHANTOM_LINES } from './missions.js';
import { buildWorld, teleportTo, setHotspotActive, setScreen, npcSay } from './world.js';
import { initHud, renderMission, toast, setAudioButtonState } from './hud.js';
import {
  openModal, closeModal, setModalContent, isOpen, esc,
  choiceButton, feedbackBlock, FICTION_NOTE, resultCue
} from './modal.js';
import { startLockdown, registerHuntHit } from './final.js';
import { sfx, subtitle, startAmbience, resumeAudio, setAudioEnabled } from './audio.js';

/* ================================================================== */
/* Boot                                                                */
/* ================================================================== */

export function initGame() {
  applySettingsToBody();
  buildWorld();

  initHud({
    onArea: (areaId) => goToArea(areaId),
    onPause: togglePause,
    onAudio: toggleAudio,
    onHelp: openHelp
  });
  setAudioButtonState(settings.audio);

  window.addEventListener('hotspot-activate', (e) => handleHotspot(e.detail.id));
  document.addEventListener('keydown', onGlobalKey);
  bus.on('gameover', ({ reason }) => endGame(reason));

  startClock();
  showMainMenu();
}

/* ================================================================== */
/* Main menu / briefing                                                */
/* ================================================================== */

export function showMainMenu() {
  setPhase('briefing');
  state.running = false;
  const best = readBest();

  openModal(`
    <p class="ov-eyebrow">Cyber awareness simulation • Assignment Executive</p>
    <h2 class="ov-title" id="overlayTitle">CYBER DEFENCE<br><span style="color:var(--amber-soft)">HIMALAYAN DATA VAULT</span></h2>
    <p class="ov-lede">
      You are the <strong>Cyber Defence Commander</strong> of the Himalayan Data Vault, a hill-city warehouse
      that stores delivery, stock and staff records. A fictional attacker calling itself
      <strong>The Phantom Hacker</strong> is trying to steal that information and publish it online.
    </p>
    <div class="phantom"><span class="from">Incoming transmission</span>${esc(PHANTOM_LINES.intro)}</div>
    <p class="ov-lede">
      Complete <strong>five missions</strong> across the Office, Loading Bay, Staff Room and Server Room
      before the Cyber Attack Meter reaches 100%, then survive the final <strong>Cyber Lockdown</strong>.
      Maximum score: <strong>${CONFIG.maxScore} Defence Points</strong>.
    </p>
    <p class="ov-section-title">Controls</p>
    <div class="keys">
      <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</div>
      <div><kbd>Mouse</kbd> Look around</div>
      <div><kbd>Click</kbd> Select the object in the crosshair</div>
      <div><kbd>1</kbd>–<kbd>9</kbd> Pick an answer</div>
      <div><kbd>P</kbd> Pause &nbsp; <kbd>M</kbd> Mute &nbsp; <kbd>H</kbd> Help</div>
      <div><kbd>1</kbd>–<kbd>4</kbd> + <kbd>Shift</kbd> Jump to an area</div>
    </div>
    ${best ? `<p class="best-score">Best score on this device: <strong>${best.points} pts (${best.percent}%) — ${esc(best.rank)}</strong></p>` : ''}
    <div class="ov-actions">
      <button type="button" class="btn btn-primary" id="btnStart" data-autofocus>START THE DEFENCE</button>
      <button type="button" class="btn" id="btnSettings">Accessibility &amp; comfort</button>
    </div>
    ${FICTION_NOTE}
  `, { dismissible: false });

  document.getElementById('btnStart').addEventListener('click', startRun);
  document.getElementById('btnSettings').addEventListener('click', () => openSettings(showMainMenu));
}

function startRun() {
  closeModal();
  ended = false;
  resetState();
  setAudioButtonState(settings.audio);
  resumeAudio();
  startAmbience();

  setPhase('playing');
  state.running = true;
  state.startedAt = Date.now();

  // Reset the world: all mission hotspots on, all hidden threats off
  MISSIONS.forEach((m) => setHotspotActive(m.hotspot, true));
  HUNT_TARGETS.forEach((t) => setHotspotActive(t.id, false));
  setScreen('office-pc', 'mail');
  setScreen('staff-pc', 'code');

  goToArea(MISSIONS[0].area, true);
  announceMission();
  toast('Mission 1 is in the Warehouse Office. Look for the glowing red marker.', 'info', 6000);
}

/* ================================================================== */
/* Mission flow                                                        */
/* ================================================================== */

function currentMission() {
  return MISSIONS[state.missionIndex] || null;
}

function announceMission() {
  const m = currentMission();
  if (!m) return;
  renderMission(m);
  subtitle(`Mission ${m.number}: ${m.title}. ${m.objective}`, '', 7000);
  if (m.npc) setTimeout(() => npcSay(m.npc, m.npcLine), 900);
}

/** Routes every 3D click to the right place. */
function handleHotspot(id) {
  if (isOpen()) return;

  // Doors work in every phase
  if (id.startsWith('door:')) { goToArea(id.slice(5)); return; }

  // Final battle: hidden threat hotspots
  if (state.phase === 'lockdown') { registerHuntHit(id); return; }

  if (state.phase !== 'playing') return;

  const mission = MISSIONS.find((m) => m.hotspot === id);
  const active = currentMission();
  if (!mission || !active) return;

  if (isMissionResolved(mission.id)) {
    toast('That threat has already been dealt with.', 'info', 2600);
    return;
  }
  if (mission.id !== active.id) {
    toast(`Finish Mission ${active.number} first: ${active.title}.`, 'info', 3200);
    return;
  }
  openMission(mission);
}

function goToArea(areaId, immediate) {
  if (!CONFIG.areaOrigin[areaId]) return;
  if (state.area === areaId && !immediate) {
    toast(`You are already in the ${AREA_NAME[areaId]}.`, 'info', 2200);
    return;
  }
  sfx.teleport();
  setArea(areaId);
  teleportTo(areaId, () => {
    const m = currentMission();
    if (m) renderMission(m);
    if (state.phase === 'playing' && m && m.area === areaId) {
      toast(`${m.title}: ${m.hint}`, 'info', 4500);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Mission dialogs                                                     */
/* ------------------------------------------------------------------ */

function missionHeader(m) {
  return `<p class="ov-eyebrow alert">${esc(m.eyebrow)}</p>
    <h2 class="ov-title amber" id="overlayTitle">MISSION ${m.number} — ${esc(m.title)}</h2>`;
}

function openMission(m) {
  setPaused(true);
  sfx.alarm();
  missionRecord(m.id);

  if (m.type === 'evidence-choice') renderEvidenceMission(m);
  else if (m.type === 'choice') renderChoiceMission(m);
  else if (m.type === 'password') renderPasswordMission(m);
  else if (m.type === 'multi') renderMultiMission(m);
  else if (m.type === 'order') renderOrderMission(m);
}

/** Shared: closes the dialog and resumes the simulation. */
function closeMission() {
  closeModal();
  setPaused(false);
}

/* --- Mission 1: phishing email ------------------------------------- */
function renderEvidenceMission(m) {
  const rec = missionRecord(m.id);

  const emailHtml = `
    <div style="border:1px solid rgba(125,160,200,.25);border-radius:10px;overflow:hidden;margin-bottom:6px">
      <div style="background:rgba(255,77,94,.14);padding:10px 14px;border-bottom:1px solid rgba(255,77,94,.3)">
        <div style="font-size:12px;color:var(--ink-faint)">From: <span style="color:#ffb9c1;font-family:var(--font-mono)">${esc(m.email.displayName)} &lt;${esc(m.email.from)}&gt;</span></div>
        <div style="font-size:12px;color:var(--ink-faint)">To: <span style="font-family:var(--font-mono)">${esc(m.email.to)}</span></div>
        <div style="margin-top:6px;font-weight:700;color:#ffd3d8">${esc(m.email.subject)}</div>
      </div>
      <div style="padding:12px 14px;font-size:13px;line-height:1.6;color:var(--ink-dim)">
        ${m.email.body.map((line) => `<p style="margin:0 0 8px">${esc(line)}</p>`).join('')}
        <p style="margin:10px 0 0;font-size:12px;color:var(--amber-soft)">\u{1F4CE} ${esc(m.email.attachment)}</p>
      </div>
    </div>`;

  openModal(`
    ${missionHeader(m)}
    <p class="ov-lede">${esc(m.objective)}</p>
    ${emailHtml}
    <p class="ov-section-title">${esc(m.evidenceTitle)}</p>
    <div class="evidence-grid" id="evidenceGrid">
      ${m.evidence.map((ev) => `<button type="button" class="evidence-card" data-id="${esc(ev.id)}">
          <span class="ev-label">${esc(ev.label)}</span><span class="ev-hint">${esc(ev.hint)}</span>
        </button>`).join('')}
    </div>
    <div id="decisionZone"></div>
  `, { dismissible: false, alert: true });

  wireEvidence(m, rec, () => renderDecision(m, m.choices));
}

/** Shared evidence-card behaviour for Missions 1 and 4. */
function wireEvidence(m, rec, onComplete) {
  const grid = document.getElementById('evidenceGrid');
  const zone = document.getElementById('decisionZone');
  const total = m.evidence.length;

  const refreshGate = () => {
    if (rec.evidence.length < total) {
      zone.innerHTML = `<p class="ov-lede" style="margin-top:14px;color:var(--ink-faint)">
        Inspect all ${total} items before you decide — <strong>${rec.evidence.length}/${total}</strong> found.</p>`;
    } else {
      onComplete();
    }
  };

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.evidence-card');
    if (!card || card.classList.contains('found')) return;
    const ev = m.evidence.find((x) => x.id === card.dataset.id);
    if (!ev) return;
    card.classList.add('found');
    card.querySelector('.ev-hint').textContent = ev.found;
    if (!rec.evidence.includes(ev.id)) rec.evidence.push(ev.id);
    sfx.select();
    refreshGate();
  });

  refreshGate();
}

/** Renders the decision buttons for a single-answer mission. */
function renderDecision(m, choices) {
  const zone = document.getElementById('decisionZone');
  zone.innerHTML = `
    <p class="ov-section-title">${esc(m.question)}</p>
    <div class="choice-list" id="choiceList">${choices.map(choiceButton).join('')}</div>`;
  wireSingleChoice(m, choices);
}

function wireSingleChoice(m, choices) {
  const list = document.getElementById('choiceList');
  const buttons = Array.from(list.querySelectorAll('.choice'));
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const choice = choices.find((c) => c.id === btn.dataset.id);
      buttons.forEach((b) => {
        b.disabled = true;
        const c = choices.find((x) => x.id === b.dataset.id);
        if (c && c.correct) b.classList.add('is-correct');
        else if (b === btn) b.classList.add('is-wrong');
      });
      finishMission(m, !!choice.correct, choice.feedback);
    });
  });
}

/* --- Mission 2: USB ------------------------------------------------ */
function renderChoiceMission(m) {
  openModal(`
    ${missionHeader(m)}
    <p class="ov-lede">${esc(m.briefing)}</p>
    <p class="ov-section-title">${esc(m.question)}</p>
    <div class="choice-list" id="choiceList">${m.choices.map(choiceButton).join('')}</div>
    <div id="resultZone"></div>
  `, { dismissible: false, alert: true });
  wireSingleChoice(m, m.choices);
}

/* --- Mission 3: password strength ---------------------------------- */
function renderPasswordMission(m) {
  openModal(`
    ${missionHeader(m)}
    <p class="ov-lede">${esc(m.briefing)}</p>
    <p class="ov-section-title">${esc(m.question)}</p>
    <div class="choice-list" id="choiceList">
      ${m.choices.map((c, i) => `<button type="button" class="choice" data-id="${esc(c.id)}">
        <span class="key" aria-hidden="true">${i + 1}</span>
        <span style="flex:1">
          <span class="choice-label" style="font-family:var(--font-mono)">${esc(c.label)}</span>
          <span class="choice-sub">${esc(c.sub)}</span>
          <span class="pw-strength">
            <span class="pw-bar"><i style="width:${c.strength}%;background:${strengthColour(c.strength)}"></i></span>
            <span class="pw-word" style="color:${strengthColour(c.strength)}">${strengthWord(c.strength)}</span>
          </span>
        </span>
      </button>`).join('')}
    </div>
    <div id="resultZone"></div>
  `, { dismissible: false, alert: true });
  wireSingleChoice(m, m.choices);
}

function strengthColour(v) { return v >= 70 ? '#3ce88f' : v >= 35 ? '#ffb020' : '#ff4d5e'; }
function strengthWord(v) { return v >= 70 ? 'Very strong' : v >= 35 ? 'Weak' : 'Very weak'; }

/* --- Mission 4: social media leak (multi-select) ------------------- */
function renderMultiMission(m) {
  const rec = missionRecord(m.id);
  openModal(`
    ${missionHeader(m)}
    <div style="border:1px solid rgba(255,77,94,.35);border-radius:10px;padding:12px 14px;background:rgba(255,77,94,.08);margin-bottom:10px">
      <div style="font-size:12px;color:#ff8f9b;font-weight:700">${esc(m.post.handle)} · <span style="color:var(--ink-faint);font-weight:400">${esc(m.post.time)}</span></div>
      <p style="margin:8px 0 0;font-size:13.5px;line-height:1.55;color:var(--ink)">${esc(m.post.text)}</p>
    </div>
    <p class="ov-section-title">${esc(m.evidenceTitle)}</p>
    <div class="evidence-grid" id="evidenceGrid">
      ${m.evidence.map((ev) => `<button type="button" class="evidence-card" data-id="${esc(ev.id)}">
          <span class="ev-label">${esc(ev.label)}</span><span class="ev-hint">${esc(ev.hint)}</span>
        </button>`).join('')}
    </div>
    <div id="decisionZone"></div>
  `, { dismissible: false, alert: true });

  wireEvidence(m, rec, () => {
    const zone = document.getElementById('decisionZone');
    zone.innerHTML = `
      <p class="ov-section-title">${esc(m.question)}</p>
      <div class="choice-list" id="choiceList">${m.choices.map(choiceButton).join('')}</div>
      <div class="ov-actions">
        <button type="button" class="btn btn-primary" id="confirmMulti" disabled>CONFIRM RESPONSE</button>
      </div>`;

    const selected = new Set();
    const list = document.getElementById('choiceList');
    const confirm = document.getElementById('confirmMulti');

    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.choice');
      if (!btn || btn.disabled) return;
      const id = btn.dataset.id;
      if (selected.has(id)) { selected.delete(id); btn.classList.remove('is-selected'); }
      else { selected.add(id); btn.classList.add('is-selected'); }
      confirm.disabled = selected.size === 0;
      sfx.select();
    });

    confirm.addEventListener('click', () => {
      const correctIds = m.choices.filter((c) => c.correct).map((c) => c.id);
      const ok = correctIds.every((id) => selected.has(id)) && [...selected].every((id) => correctIds.includes(id));

      Array.from(list.querySelectorAll('.choice')).forEach((btn) => {
        btn.disabled = true;
        const c = m.choices.find((x) => x.id === btn.dataset.id);
        if (c.correct) btn.classList.add('is-correct');
        else if (selected.has(c.id)) btn.classList.add('is-wrong');
      });
      confirm.remove();

      const detail = m.choices
        .filter((c) => c.correct || selected.has(c.id))
        .map((c) => `${c.correct ? '✓' : '✕'} ${c.label} — ${c.feedback}`)
        .join(' ');
      finishMission(m, ok, detail);
    });
  });
}

/* --- Mission 5: incident-response ordering ------------------------- */
function renderOrderMission(m) {
  const shuffled = shuffle(m.steps.slice());
  openModal(`
    ${missionHeader(m)}
    <p class="ov-lede">${esc(m.briefing)}</p>
    <p class="ov-section-title">${esc(m.question)}</p>
    <div class="order-pool choice-list" id="orderPool">
      ${shuffled.map((s, i) => `<button type="button" class="choice" data-id="${esc(s.id)}">
          <span class="key" aria-hidden="true">${i + 1}</span>
          <span><span class="choice-label">${esc(s.label)}</span><span class="choice-sub">${esc(s.detail)}</span></span>
        </button>`).join('')}
    </div>
    <p class="ov-section-title">Your response order</p>
    <div class="order-slots" id="orderSlots">
      ${m.steps.map(() => '<div class="order-slot"><span class="slot-text">— choose a step —</span></div>').join('')}
    </div>
    <div class="ov-actions">
      <button type="button" class="btn btn-primary" id="confirmOrder" disabled>EXECUTE LOCKDOWN</button>
      <button type="button" class="btn" id="resetOrder">Clear</button>
    </div>
    <div id="resultZone"></div>
  `, { dismissible: false, alert: true });

  const pool = document.getElementById('orderPool');
  const slots = document.getElementById('orderSlots');
  const confirm = document.getElementById('confirmOrder');
  const placed = [];

  function redraw() {
    Array.from(slots.children).forEach((slot, i) => {
      const step = placed[i] ? m.steps.find((s) => s.id === placed[i]) : null;
      slot.className = 'order-slot' + (step ? ' filled' : '');
      slot.innerHTML = step
        ? `<span class="slot-text">${esc(step.label)}</span><button type="button" class="slot-remove" data-slot="${i}" aria-label="Remove ${esc(step.label)}">✕</button>`
        : '<span class="slot-text">— choose a step —</span>';
    });
    Array.from(pool.children).forEach((btn) => {
      const used = placed.includes(btn.dataset.id);
      btn.disabled = used;
      btn.style.opacity = used ? '0.35' : '';
    });
    confirm.disabled = placed.length !== m.steps.length;
  }

  pool.addEventListener('click', (e) => {
    const btn = e.target.closest('.choice');
    if (!btn || btn.disabled || placed.length >= m.steps.length) return;
    placed.push(btn.dataset.id);
    sfx.select();
    redraw();
  });

  slots.addEventListener('click', (e) => {
    const rm = e.target.closest('.slot-remove');
    if (!rm) return;
    placed.splice(Number(rm.dataset.slot), 1);
    redraw();
  });

  document.getElementById('resetOrder').addEventListener('click', () => { placed.length = 0; redraw(); });

  confirm.addEventListener('click', () => {
    const ok = placed.every((id, i) => id === m.correctOrder[i]);
    Array.from(slots.children).forEach((slot, i) => {
      slot.classList.add(placed[i] === m.correctOrder[i] ? 'slot-correct' : 'slot-wrong');
      const rm = slot.querySelector('.slot-remove');
      if (rm) rm.remove();
    });
    confirm.remove();
    document.getElementById('resetOrder').remove();
    const detail = m.correctOrder
      .map((id, i) => `${i + 1}. ${m.steps.find((s) => s.id === id).label}`)
      .join('  ');
    finishMission(m, ok, `Correct order: ${detail}`);
  });

  redraw();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ------------------------------------------------------------------ */
/* Resolving a mission - the ONLY place points are awarded             */
/* ------------------------------------------------------------------ */

function finishMission(m, ok, detail) {
  const rec = missionRecord(m.id);
  if (rec.status !== 'pending') return;     // never score the same mission twice

  rec.status = ok ? 'done' : 'failed';
  rec.attempts += 1;

  if (ok) {
    rec.earned = m.points;
    addPoints(m.points, m.title);
    markThreatStopped();
    addAttack(-5, 'mission-success');
    addDebrief(true, `Mission ${m.number}: ${m.title}`, m.tip);
  } else {
    rec.earned = 0;
    addAttack(m.penalty, 'mission-failed');
    addDebrief(false, `Mission ${m.number}: ${m.title}`, m.tip);
    subtitle(m.number % 2 ? PHANTOM_LINES.taunt1 : PHANTOM_LINES.taunt2, 'phantom', 5000);
  }
  resultCue(ok);
  setHotspotActive(m.hotspot, false);
  applyWorldChange(m, ok);

  // Feedback panel, then continue
  const zone = document.getElementById('resultZone') || document.getElementById('decisionZone') || document.getElementById('overlayBody');
  const html = feedbackBlock(ok, ok ? m.successTitle : 'Threat not contained', ok ? m.successText : m.failText, m.tip)
    + `<div class="feedback" style="border-left-color:var(--steel-400)"><p style="margin:0">${esc(detail)}</p></div>`
    + (ok && m.extra ? `<div class="feedback good"><h4>${esc(m.extra.title)}</h4><p style="margin:0">${esc(m.extra.text)}</p></div>` : '')
    + `<div class="ov-actions"><button type="button" class="btn btn-primary" id="btnContinue" data-autofocus>${
        ok ? `+${m.points} DEFENCE POINTS — CONTINUE` : `ATTACK METER +${m.penalty}% — CONTINUE`
      }</button></div>`;

  const holder = document.createElement('div');
  holder.innerHTML = html;
  zone.appendChild(holder);
  const cont = document.getElementById('btnContinue');
  cont.scrollIntoView({ behavior: settings.reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  cont.focus();
  cont.addEventListener('click', () => { closeMission(); advanceMission(); });
}

/** Small visible change in the 3D world so progress feels real. */
function applyWorldChange(m, ok) {
  if (m.id === 'm1' && ok) setScreen('office-pc', 'lock');
  if (m.id === 'm3' && ok) setScreen('staff-pc', 'lock');
  if (m.id === 'm4' && ok) setScreen('wall-screen', 'cctv');
  if (m.id === 'm5' && ok) setScreen('server-console', 'stock');
}

function advanceMission() {
  state.missionIndex += 1;
  if (state.missionIndex >= MISSIONS.length) {
    beginFinale();
    return;
  }
  const m = currentMission();
  announceMission();
  toast(`Mission ${m.number}: ${m.title} — ${AREA_NAME[m.area]}`, 'info', 5000);
}

function beginFinale() {
  renderMission(null, { chip: 'FINAL', title: 'CYBER LOCKDOWN', objective: 'Find the three remaining threats, then complete the final assessment.', area: state.area });
  startLockdown({ onComplete: () => endGame('complete') });
}

/* ================================================================== */
/* Pause, settings and help                                            */
/* ================================================================== */

function togglePause() {
  if (state.phase === 'briefing' || state.phase === 'ended') return;
  if (isOpen()) return;
  setPaused(true);
  openModal(`
    <p class="ov-eyebrow">Simulation paused</p>
    <h2 class="ov-title" id="overlayTitle">PAUSED</h2>
    <p class="ov-lede">The clock and the attack meter are frozen. Take your time.</p>
    <div class="ov-actions">
      <button type="button" class="btn btn-primary" id="btnResume" data-autofocus>RESUME</button>
      <button type="button" class="btn" id="btnPauseSettings">Accessibility &amp; comfort</button>
      <button type="button" class="btn btn-danger" id="btnQuit">Abandon and return to menu</button>
    </div>
  `, { dismissible: true, onClose: () => setPaused(false) });

  document.getElementById('btnResume').addEventListener('click', closeModal);
  document.getElementById('btnPauseSettings').addEventListener('click', () => openSettings(togglePauseReopen));
  document.getElementById('btnQuit').addEventListener('click', () => { closeModal(); setPaused(false); showMainMenu(); });
}

function togglePauseReopen() { closeModal(); setPaused(false); togglePause(); }

function toggleAudio() {
  const on = !settings.audio;
  setAudioEnabled(on);
  saveSettings();
  setAudioButtonState(on);
  if (on) { resumeAudio(); startAmbience(); }
  toast(on ? 'Audio on' : 'Audio muted (subtitles stay on)', 'info', 2200);
}

function openHelp() {
  const wasPaused = state.paused;
  setPaused(true);
  openModal(`
    <p class="ov-eyebrow">Reference</p>
    <h2 class="ov-title" id="overlayTitle">CONTROLS &amp; BRIEFING</h2>
    <p class="ov-section-title">Moving and selecting</p>
    <div class="keys">
      <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</div>
      <div><kbd>Mouse</kbd> / drag Look around</div>
      <div><kbd>Click</kbd> Select what the crosshair is on</div>
      <div><kbd>Esc</kbd> Release the mouse</div>
      <div><kbd>Shift</kbd>+<kbd>1..4</kbd> Jump to an area</div>
      <div><kbd>1</kbd>–<kbd>9</kbd> Choose an answer</div>
      <div><kbd>P</kbd> Pause</div>
      <div><kbd>M</kbd> Mute / unmute</div>
      <div><kbd>H</kbd> This screen</div>
    </div>
    <p class="ov-section-title">On a phone or tablet</p>
    <p class="ov-lede">Drag anywhere to look around, use the on-screen stick to walk, and press <strong>SELECT</strong> to activate whatever is in the crosshair.</p>
    <p class="ov-section-title">Scoring</p>
    <p class="ov-lede">Five missions are worth 100, 100, 100, 150 and 200 Defence Points. The final assessment adds up to 100 more, for a maximum of <strong>${CONFIG.maxScore}</strong>. A wrong decision pushes the Cyber Attack Meter up - reach 100% and the vault is breached.</p>
    <div class="ov-actions">
      <button type="button" class="btn btn-primary" id="btnCloseHelp" data-autofocus>BACK TO THE SIMULATION</button>
      <button type="button" class="btn" id="btnHelpSettings">Accessibility &amp; comfort</button>
    </div>
    ${FICTION_NOTE}
  `, { dismissible: true, onClose: () => { if (!wasPaused) setPaused(false); } });

  document.getElementById('btnCloseHelp').addEventListener('click', closeModal);
  document.getElementById('btnHelpSettings').addEventListener('click', () => openSettings(() => { closeModal(); if (!wasPaused) setPaused(false); }));
}

export function openSettings(onBack) {
  const row = (key, title, desc) => `
    <div class="setting-row">
      <span><strong>${title}</strong><span class="s-desc">${desc}</span></span>
      <button type="button" class="switch" role="switch" data-key="${key}" aria-checked="${settings[key] ? 'true' : 'false'}" aria-label="${title}"><i></i></button>
    </div>`;

  setModalContent(`
    <p class="ov-eyebrow">Comfort</p>
    <h2 class="ov-title" id="overlayTitle">ACCESSIBILITY &amp; COMFORT</h2>
    ${row('audio', 'Audio', 'Ambient sound and effect cues. Subtitles stay available either way.')}
    ${row('subtitles', 'Subtitles', 'Show captions for every spoken line and audio cue.')}
    ${row('reduceMotion', 'Reduce motion', 'Turns off pulsing, bobbing, head movement and screen animation.')}
    ${row('highContrast', 'High contrast', 'Removes the scan-line overlay and strengthens text contrast.')}
    ${row('reducePressure', 'Reduce time pressure', 'Stops the attack meter from rising on its own. Wrong answers still count.')}
    <div class="ov-actions">
      <button type="button" class="btn btn-primary" id="btnSettingsBack" data-autofocus>BACK</button>
    </div>
  `);

  document.getElementById('overlayBody').querySelectorAll('.switch').forEach((sw) => {
    sw.addEventListener('click', () => {
      const key = sw.dataset.key;
      settings[key] = !settings[key];
      sw.setAttribute('aria-checked', settings[key] ? 'true' : 'false');
      if (key === 'audio') { setAudioEnabled(settings[key]); setAudioButtonState(settings[key]); if (settings[key]) { resumeAudio(); startAmbience(); } }
      saveSettings();
      sfx.select();
    });
  });
  document.getElementById('btnSettingsBack').addEventListener('click', () => { if (onBack) onBack(); });
}

/* ================================================================== */
/* Keyboard shortcuts                                                  */
/* ================================================================== */

function onGlobalKey(e) {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const key = e.key.toLowerCase();
  if (key === 'p' && !isOpen()) { e.preventDefault(); togglePause(); }
  else if (key === 'm') { e.preventDefault(); toggleAudio(); }
  else if (key === 'h' && !isOpen()) { e.preventDefault(); openHelp(); }
  else if (e.shiftKey && /^[1-4]$/.test(e.key) && !isOpen()) {
    e.preventDefault();
    goToArea(CONFIG.areas[Number(e.key) - 1].id);
  }
}

/* ================================================================== */
/* End screens                                                         */
/* ================================================================== */

let ended = false;

function endGame(reason) {
  if (ended) return;
  ended = true;
  state.running = false;
  state.endReason = reason;
  setPhase('ended');
  setPaused(false);
  document.body.classList.remove('alert-high');

  const percent = Math.round((state.points / CONFIG.maxScore) * 100);
  const rank = CONFIG.ranks.find((r) => percent >= r.min) || CONFIG.ranks[CONFIG.ranks.length - 1];
  const systemsProtected = MISSIONS.filter((m) => state.missions[m.id] && state.missions[m.id].status === 'done').length;
  const timeLeft = reason === 'complete' ? state.timeLeft : 0;

  const best = writeBest({ points: state.points, percent, rank: rank.name, date: new Date().toISOString().slice(0, 10) });
  const isNewBest = best.points === state.points && best.percent === percent;

  const won = reason === 'complete';
  if (won) sfx.victory(); else sfx.breach();

  const headline = won
    ? { eyebrow: 'Simulation complete', title: 'VAULT SECURED', cls: '' }
    : reason === 'breach'
      ? { eyebrow: 'Simulation ended', title: 'VAULT BREACHED', cls: 'alert' }
      : { eyebrow: 'Simulation ended', title: 'OUT OF TIME', cls: 'alert' };

  openModal(`
    <p class="ov-eyebrow ${headline.cls}">${headline.eyebrow}</p>
    <h2 class="ov-title ${headline.cls}" id="overlayTitle">${headline.title}</h2>
    <p class="ov-lede">${won
      ? `The Phantom Hacker's connection was terminated by your defence grid. ${esc(PHANTOM_LINES.victory)}`
      : reason === 'breach'
        ? 'The Cyber Attack Meter reached 100%. In a real warehouse this is the point where stock, delivery and staff records are taken offline. Review the debrief and run the simulation again.'
        : 'The countdown ran out before the vault was secured. Review the debrief and try again - speed comes from recognising the patterns.'}
    </p>

    <div class="rank-badge ${rank.name === 'Trainee' ? 'rank-trainee' : ''}">
      <span class="rank-emoji" aria-hidden="true">${rank.emoji}</span>
      <div>
        <p class="rank-name">${esc(rank.name)}</p>
        <p class="rank-desc">${esc(rank.desc)}</p>
      </div>
    </div>

    <div class="result-grid">
      <div class="result-tile"><span class="r-label">Defence Points</span><span class="r-value">${state.points}</span></div>
      <div class="result-tile"><span class="r-label">Score</span><span class="r-value">${percent}%</span></div>
      <div class="result-tile"><span class="r-label">Threats Stopped</span><span class="r-value">${state.threatsStopped}/${CONFIG.totalThreats}</span></div>
      <div class="result-tile"><span class="r-label">Systems Protected</span><span class="r-value">${systemsProtected}/${MISSIONS.length}</span></div>
      <div class="result-tile"><span class="r-label">Time Remaining</span><span class="r-value">${formatClock(timeLeft)}</span></div>
      <div class="result-tile"><span class="r-label">Attack Meter</span><span class="r-value">${Math.round(state.attack)}%</span></div>
    </div>

    ${isNewBest ? '<p class="best-score">⭐ New best score on this device!</p>' : `<p class="best-score">Best score on this device: <strong>${best.points} pts (${best.percent}%) — ${esc(best.rank)}</strong></p>`}

    <p class="ov-section-title">Debrief — what to take back to the warehouse floor</p>
    <ul class="debrief">
      ${state.debrief.map((d) => `<li class="${d.ok ? 'ok' : 'no'}"><span aria-hidden="true">${d.ok ? '✓' : '✕'}</span><span><b>${esc(d.title)}</b><br>${esc(d.text)}</span></li>`).join('')}
    </ul>

    <div class="ov-actions">
      <button type="button" class="btn btn-primary" id="btnPlayAgain" data-autofocus>PLAY AGAIN</button>
      <button type="button" class="btn" id="btnMenu">RETURN TO MAIN MENU</button>
    </div>
    ${FICTION_NOTE}
  `, { dismissible: false, alert: !won, win: won });

  document.getElementById('btnPlayAgain').addEventListener('click', () => { ended = false; closeModal(); startRun(); });
  document.getElementById('btnMenu').addEventListener('click', () => { ended = false; closeModal(); showMainMenu(); });
}

function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
