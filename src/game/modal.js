/**
 * modal.js
 * A single reusable overlay used for every panel in the game: briefing,
 * mission dialogs, pause, settings and the end screens.
 *
 * It handles focus management, Escape, pointer-lock release and keyboard
 * shortcuts (1-9 select answers) so individual screens stay simple.
 */

import { settings } from './state.js';
import { sfx } from './audio.js';

const overlay = () => document.getElementById('overlay');
const body = () => document.getElementById('overlayBody');

let closeHandler = null;
let lastFocus = null;
let keyHandler = null;

export function isOpen() {
  return !overlay().hasAttribute('hidden');
}

/**
 * Open the overlay.
 * @param {string} html        inner HTML for the dialog
 * @param {object} opts        { onClose, dismissible, alert, win, onKey }
 */
export function openModal(html, opts = {}) {
  const ov = overlay();
  const bd = body();
  lastFocus = document.activeElement;

  bd.className = 'overlay-body' + (opts.alert ? ' is-alert' : '') + (opts.win ? ' is-win' : '');
  bd.innerHTML = html;
  ov.removeAttribute('hidden');
  document.body.classList.add('modal-open');

  // Release pointer lock so the player can use the mouse on the dialog
  if (document.pointerLockElement) document.exitPointerLock();

  closeHandler = opts.onClose || null;

  // Focus the first sensible control WITHOUT scrolling the dialog: the results
  // screen autofocuses its buttons, which sit below the score and the rank.
  bd.scrollTop = 0;
  requestAnimationFrame(() => {
    const target = bd.querySelector('[data-autofocus]') || bd.querySelector('button, [href], input, select') || bd;
    if (target && target.focus) target.focus({ preventScroll: true });
    bd.scrollTop = 0;
  });

  // Keyboard: Escape to dismiss, number keys to pick answers, Tab trapping
  keyHandler = (e) => {
    if (e.key === 'Escape' && opts.dismissible !== false) {
      e.preventDefault();
      closeModal();
      return;
    }
    if (opts.onKey && opts.onKey(e) === true) return;
    if (/^[1-9]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      const choices = bd.querySelectorAll('.choice:not(:disabled), .evidence-card:not(.found), .order-pool .choice');
      if (choices[idx]) { e.preventDefault(); choices[idx].click(); }
    }
    if (e.key === 'Tab') trapFocus(e, bd);
  };
  document.addEventListener('keydown', keyHandler, true);

  return bd;
}

export function closeModal() {
  const ov = overlay();
  if (ov.hasAttribute('hidden')) return;
  ov.setAttribute('hidden', '');
  document.body.classList.remove('modal-open');
  document.removeEventListener('keydown', keyHandler, true);
  keyHandler = null;
  const cb = closeHandler;
  closeHandler = null;
  if (lastFocus && lastFocus.focus) lastFocus.focus();
  if (cb) cb();
}

/** Replace the dialog contents without closing (used for multi-step flows). */
export function setModalContent(html, opts = {}) {
  const bd = body();
  bd.className = 'overlay-body' + (opts.alert ? ' is-alert' : '') + (opts.win ? ' is-win' : '');
  bd.innerHTML = html;
  bd.scrollTop = 0;
  requestAnimationFrame(() => {
    const target = bd.querySelector('[data-autofocus]') || bd.querySelector('button');
    if (target && target.focus) target.focus({ preventScroll: true });
  });
  return bd;
}

function trapFocus(e, container) {
  const focusables = container.querySelectorAll('button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ------------------------------------------------------------------ */
/* Small HTML helpers shared by the mission screens                    */
/* ------------------------------------------------------------------ */

/** Escapes user-facing text so content is never treated as markup. */
export function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function choiceButton(choice, index) {
  return `<button type="button" class="choice" data-id="${esc(choice.id)}">
      <span class="key" aria-hidden="true">${index + 1}</span>
      <span><span class="choice-label">${esc(choice.label)}</span>${choice.sub ? `<span class="choice-sub">${esc(choice.sub)}</span>` : ''}</span>
    </button>`;
}

export function feedbackBlock(ok, title, text, tip) {
  return `<div class="feedback ${ok ? 'good' : 'bad'}" role="status">
      <h4>${ok ? '✓ ' : '✕ '}${esc(title)}</h4>
      <p style="margin:0">${esc(text)}</p>
      ${tip ? `<span class="tip">\u{1F4A1} ${esc(tip)}</span>` : ''}
    </div>`;
}

export const FICTION_NOTE = `<p class="fiction-note">This is a fictional training simulation. Himalayan Data Vault, its staff and "The Phantom Hacker" are invented for this exercise. No real organisation, person or system is represented, and nothing here describes how to carry out an attack.</p>`;

/** Plays the right cue and returns the class for a result. */
export function resultCue(ok) {
  if (!settings.audio) return;
  if (ok) sfx.correct(); else sfx.wrong();
}
