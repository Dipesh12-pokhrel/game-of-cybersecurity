/**
 * main.js - entry point.
 *
 * Waits for A-Frame and the scene to be ready, registers the custom
 * components, generates the world and starts the simulation.
 *
 * Note: the stylesheet is linked from index.html rather than imported here,
 * so the whole game runs from any plain static server with no build step.
 *
 * Everything is fictional: Himalayan Data Vault, its staff and "The Phantom
 * Hacker" are invented for this training exercise.
 */

const BOOT_MESSAGES = [
  'Loading Himalayan Data Vault…',
  'Generating warehouse geometry…',
  'Powering up monitors and alert lights…',
  'Briefing warehouse staff…',
  'Arming the defence grid…'
];

function setBootMessage(i) {
  const el = document.getElementById('bootSub');
  if (el) el.textContent = BOOT_MESSAGES[i % BOOT_MESSAGES.length];
}

let bootStep = 0;
const bootTimer = setInterval(() => setBootMessage(++bootStep), 700);

/** A-Frame is loaded from a <script> tag, so wait for it before booting. */
function whenAframeReady(cb, attempt = 0) {
  if (window.AFRAME && window.AFRAME.THREE) { cb(); return; }
  if (attempt > 200) {                                     // ~20 seconds
    clearInterval(bootTimer);
    const sub = document.getElementById('bootSub');
    if (sub) {
      sub.innerHTML = 'A-Frame could not be loaded.<br>Check your internet connection, or follow ' +
        '"Running fully offline" in README.md to serve A-Frame from node_modules.';
      sub.style.color = '#ff8f9b';
    }
    return;
  }
  setTimeout(() => whenAframeReady(cb, attempt + 1), 100);
}

whenAframeReady(async () => {
  // Components must be registered before the scene finishes loading.
  await import('./components/index.js');
  const { initGame } = await import('./game/game.js');

  const scene = document.getElementById('scene');

  let booted = false;
  const boot = () => {
    if (booted) return;
    booted = true;
    clearInterval(bootTimer);
    initGame();
    const bootEl = document.getElementById('boot');
    if (bootEl) {
      bootEl.classList.add('is-hidden');
      setTimeout(() => bootEl.remove(), 700);
    }
  };

  if (scene.hasLoaded) boot();
  else scene.addEventListener('loaded', boot, { once: true });

  // Safety net: never leave the player staring at the boot screen.
  setTimeout(() => { if (document.getElementById('boot')) boot(); }, 9000);
});

// Any first interaction unlocks the Web Audio context (browsers require a
// user gesture before audio can start).
let audioUnlocked = false;
const unlockAudio = async () => {
  if (audioUnlocked) return;
  audioUnlocked = true;
  const { resumeAudio, startAmbience } = await import('./game/audio.js');
  resumeAudio();
  startAmbience();
  ['click', 'keydown', 'touchstart'].forEach((evt) => window.removeEventListener(evt, unlockAudio));
};
['click', 'keydown', 'touchstart'].forEach((evt) => window.addEventListener(evt, unlockAudio));
