/**
 * final.js
 * The "Cyber Lockdown" finale:
 *   1. 60 seconds to find three remaining threat hotspots across the site
 *   2. a five-question final quiz worth 20 points each
 *
 * The Phantom Hacker only ever appears as fictional on-screen text and a
 * distorted synthesised tone - never as a person.
 */

import { CONFIG } from './config.js';
import { state, bus, addPoints, addAttack, markThreatStopped, addDebrief, setPhase } from './state.js';
import { HUNT_TARGETS, QUIZ, PHANTOM_LINES } from './missions.js';
import { openModal, closeModal, setModalContent, esc, FICTION_NOTE, resultCue } from './modal.js';
import { showHuntTracker, updateHuntTracker, hideHuntTracker, toast } from './hud.js';
import { setHotspotActive } from './world.js';
import { sfx, subtitle } from './audio.js';

let unsubscribeStats = null;
let unsubscribeTimeout = null;
let onFinished = null;

/* ------------------------------------------------------------------ */
/* Phase 1 - the hotspot hunt                                          */
/* ------------------------------------------------------------------ */

export function startLockdown(opts) {
  onFinished = opts.onComplete;
  state.lockdownLeft = CONFIG.lockdownTime;
  state.huntFound = [];

  sfx.phantom();
  subtitle(PHANTOM_LINES.lockdown, 'phantom', 7000);

  openModal(`
    <p class="ov-eyebrow alert">Final challenge</p>
    <h2 class="ov-title alert" id="overlayTitle">CYBER LOCKDOWN</h2>
    <div class="phantom"><span class="from">Incoming transmission</span>${esc(PHANTOM_LINES.lockdown)}</div>
    <p class="ov-lede">Three weak points are still open across the site. You have <strong>${CONFIG.lockdownTime} seconds</strong> to find all three, then a final five-question assessment.</p>
    <p class="ov-lede">Use the area buttons or the doors to move between the Office, Loading Bay, Staff Room and Server Room. Look for the <strong>red glowing markers</strong>.</p>
    <div class="ov-actions">
      <button type="button" class="btn btn-primary" id="startHunt" data-autofocus>BEGIN LOCKDOWN</button>
    </div>
    ${FICTION_NOTE}
  `, { dismissible: false, alert: true });

  document.getElementById('startHunt').addEventListener('click', beginHunt);
}

function beginHunt() {
  closeModal();
  setPhase('lockdown');
  state.running = true;

  HUNT_TARGETS.forEach((t) => setHotspotActive(t.id, true));
  showHuntTracker(HUNT_TARGETS.length);
  updateHuntTracker(0, state.lockdownLeft);
  toast('Find the three remaining threats before the timer runs out.', 'bad', 5000);

  unsubscribeStats = bus.on('stats', (s) => updateHuntTracker(state.huntFound.length, s.lockdownLeft));
  unsubscribeTimeout = bus.on('lockdown-timeout', () => finishHunt(true));
}

/** Called by the hotspot router in game.js when a hunt target is clicked. */
export function registerHuntHit(id) {
  if (state.phase !== 'lockdown') return false;
  const target = HUNT_TARGETS.find((t) => t.id === id);
  if (!target || state.huntFound.includes(id)) return false;

  state.huntFound.push(id);
  setHotspotActive(id, false);
  markThreatStopped();
  addPoints(CONFIG.huntBonusPoints || 0, target.label);
  addAttack(-2, 'threat-found');
  sfx.correct();
  toast(`${target.label} — ${target.text}`, 'good', 6000);
  subtitle(`Threat secured: ${target.label}.`);
  addDebrief(true, target.label, target.text);
  updateHuntTracker(state.huntFound.length, state.lockdownLeft);

  if (state.huntFound.length >= HUNT_TARGETS.length) finishHunt(false);
  return true;
}

function finishHunt(timedOut) {
  if (unsubscribeStats) { unsubscribeStats(); unsubscribeStats = null; }
  if (unsubscribeTimeout) { unsubscribeTimeout(); unsubscribeTimeout = null; }
  hideHuntTracker();
  HUNT_TARGETS.forEach((t) => setHotspotActive(t.id, false));

  const missed = HUNT_TARGETS.filter((t) => !state.huntFound.includes(t.id));
  missed.forEach((t) => {
    addAttack(6, 'missed-threat');
    addDebrief(false, `Missed: ${t.label}`, t.text);
  });

  setPhase('quiz');
  state.quizIndex = 0;
  state.quizCorrect = 0;

  const summary = timedOut
    ? `Time is up. You secured <strong>${state.huntFound.length} of ${HUNT_TARGETS.length}</strong> remaining threats.`
    : `Excellent sweep - all <strong>${HUNT_TARGETS.length}</strong> threats secured with <strong>${Math.ceil(state.lockdownLeft)}s</strong> to spare.`;

  openModal(`
    <p class="ov-eyebrow">Lockdown phase complete</p>
    <h2 class="ov-title amber" id="overlayTitle">FINAL ASSESSMENT</h2>
    <p class="ov-lede">${summary}</p>
    ${missed.length ? `<p class="ov-lede">Threats you did not reach: <strong>${missed.map((m) => esc(m.label)).join(', ')}</strong>. Each one pushed the attack meter up.</p>` : ''}
    <p class="ov-lede">Five questions remain, worth <strong>${CONFIG.quizPointsPerQuestion} Defence Points</strong> each. Answer carefully - there is no timer on this section.</p>
    <div class="ov-actions">
      <button type="button" class="btn btn-primary" id="startQuiz" data-autofocus>START ASSESSMENT</button>
    </div>
  `, { dismissible: false });

  document.getElementById('startQuiz').addEventListener('click', () => renderQuestion(0));
}

/* ------------------------------------------------------------------ */
/* Phase 2 - the five-question assessment                              */
/* ------------------------------------------------------------------ */

function renderQuestion(index) {
  state.quizIndex = index;
  const q = QUIZ[index];

  setModalContent(`
    <div class="quiz-meta">
      <span>Final assessment</span>
      <span>Question ${index + 1} of ${QUIZ.length}</span>
    </div>
    <h2 class="ov-title" id="overlayTitle" style="font-size:20px">${esc(q.q)}</h2>
    <div class="choice-list" id="quizChoices">
      ${q.a.map((answer, i) => `<button type="button" class="choice" data-index="${i}">
          <span class="key" aria-hidden="true">${i + 1}</span><span>${esc(answer)}</span>
        </button>`).join('')}
    </div>
    <div id="quizFeedback"></div>
  `);

  const buttons = Array.from(document.querySelectorAll('#quizChoices .choice'));
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => answerQuestion(index, Number(btn.dataset.index), buttons));
  });
}

function answerQuestion(index, picked, buttons) {
  const q = QUIZ[index];
  const ok = picked === q.correct;

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('is-correct');
    else if (i === picked) btn.classList.add('is-wrong');
  });

  if (ok) {
    state.quizCorrect += 1;
    addPoints(CONFIG.quizPointsPerQuestion, 'Correct answer');
    addDebrief(true, `Q${index + 1} correct`, q.why);
  } else {
    addAttack(CONFIG.quizPenalty, 'quiz-wrong');
    addDebrief(false, `Q${index + 1} incorrect`, q.why);
  }
  resultCue(ok);

  const isLast = index === QUIZ.length - 1;
  document.getElementById('quizFeedback').innerHTML = `
    <div class="feedback ${ok ? 'good' : 'bad'}" role="status">
      <h4>${ok ? '✓ Correct' : '✕ Not quite'}</h4>
      <p style="margin:0">${esc(q.why)}</p>
    </div>
    <div class="ov-actions">
      <button type="button" class="btn btn-primary" id="quizNext" data-autofocus>${isLast ? 'VIEW RESULTS' : 'NEXT QUESTION'}</button>
    </div>`;

  document.getElementById('quizNext').addEventListener('click', () => {
    if (isLast) completeFinale();
    else renderQuestion(index + 1);
  });
  document.getElementById('quizNext').focus();
}

function completeFinale() {
  closeModal();
  state.running = false;
  setPhase('ended');
  state.endReason = 'complete';
  subtitle(PHANTOM_LINES.defeated, 'phantom', 6000);
  sfx.victory();
  if (onFinished) onFinished();
}
