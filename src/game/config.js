/**
 * config.js
 * Central tuning values for Cyber Defence: Himalayan Data Vault.
 * Change anything here to re-balance the game without touching logic.
 */

export const CONFIG = {
  /** Total time (seconds) to finish all five missions. */
  missionTime: 600,

  /** Seconds for the final "Cyber Lockdown" hotspot hunt. */
  lockdownTime: 60,

  /**
   * Passive pressure: how much the attack meter creeps up per second while
   * missions are still open. Disabled by the "Reduce pressure" setting.
   */
  attackDriftPerSecond: 55 / 600,

  /** Meter value at which the simulation is lost. */
  attackMax: 100,

  /** Meter value that switches the HUD into red-alert mode. */
  alertThreshold: 70,

  /** Maximum achievable score (5 missions + final quiz). */
  maxScore: 750,

  /** Points for each correct answer of the 5-question final quiz. */
  quizPointsPerQuestion: 20,

  /** Attack meter penalty for a wrong final-quiz answer. */
  quizPenalty: 5,

  /** Points awarded for each hidden threat hotspot found in the finale. */
  huntBonusPoints: 0,

  /** localStorage key for the best score. */
  storageKey: 'cdhdv.best.v1',

  /** localStorage key for accessibility / comfort settings. */
  settingsKey: 'cdhdv.settings.v1',

  /** Total threats the player can stop (5 missions + 3 hidden hotspots). */
  totalThreats: 8,

  /** Rank bands, checked from the top down. */
  ranks: [
    { min: 90, name: 'Cyber Commander', emoji: '\u{1F396}\u{FE0F}', desc: 'Outstanding. You spotted every trap, protected the vault and would be trusted to lead an incident response shift.' },
    { min: 70, name: 'Cyber Defender', emoji: '\u{1F6E1}\u{FE0F}', desc: 'Strong work. Your instincts are good - keep sharpening how quickly you report incidents.' },
    { min: 40, name: 'Cyber Guardian', emoji: '\u{1F9ED}', desc: 'Solid foundation. Review the debrief below and re-run the simulation to lock in the safe habits.' },
    { min: 0, name: 'Trainee', emoji: '\u{1F4DA}', desc: 'A good first attempt. Read each debrief point carefully, then run the simulation again - most people improve a lot on the second try.' }
  ],

  /** World positions of the four areas (each area is its own block of space). */
  areaOrigin: {
    office: { x: 0, z: 0 },
    bay: { x: 100, z: 0 },
    staff: { x: 200, z: 0 },
    server: { x: 300, z: 0 }
  },

  /** Human-readable area data used by the HUD and the world builder. */
  areas: [
    { id: 'office', name: 'Warehouse Office', icon: '\u{1F5A5}\u{FE0F}', spawn: { x: 0, z: 4 } },
    { id: 'bay', name: 'Loading Bay', icon: '\u{1F4E6}', spawn: { x: 0, z: 4 } },
    { id: 'staff', name: 'Staff Room', icon: '☕', spawn: { x: 0, z: 4 } },
    { id: 'server', name: 'Server Room', icon: '\u{1F5C4}\u{FE0F}', spawn: { x: 0, z: 4 } }
  ],

  /** Half-extents used to keep the player inside each room. */
  roomBounds: { x: 6.4, z: 4.6 }
};

export const AREA_NAME = Object.fromEntries(CONFIG.areas.map((a) => [a.id, a.name]));
