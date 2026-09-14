/**
 * tests/logic.test.mjs
 * Headless checks for the rules that matter most: the score adds up to 750,
 * the rank bands are correct, a mission can never be scored twice and the
 * attack meter clamps properly.
 *
 * Run with:  npm test        (no test framework or browser needed)
 */

// Minimal browser stubs so the pure-logic modules can run under Node.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};
globalThis.window = {
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {}
};
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.document = { body: { classList: { toggle() {}, add() {}, remove() {} } } };

const { CONFIG } = await import('../src/game/config.js');
const { MISSIONS, QUIZ, HUNT_TARGETS } = await import('../src/game/missions.js');
const S = await import('../src/game/state.js');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + msg); if (!cond) fails++; };

// --- content integrity -------------------------------------------------
const missionTotal = MISSIONS.reduce((a, m) => a + m.points, 0);
const quizTotal = QUIZ.length * CONFIG.quizPointsPerQuestion;
ok(missionTotal === 650, `mission points total 650 (got ${missionTotal})`);
ok(quizTotal === 100, `quiz points total 100 (got ${quizTotal})`);
ok(missionTotal + quizTotal === CONFIG.maxScore, `max score is ${CONFIG.maxScore}`);
ok(CONFIG.totalThreats === MISSIONS.length + HUNT_TARGETS.length, 'threat count = 5 missions + 3 hidden');
ok(MISSIONS.every((m, i) => m.number === i + 1), 'missions numbered 1..5');
ok(MISSIONS.every((m) => CONFIG.areaOrigin[m.area]), 'every mission targets a real area');
ok(new Set(MISSIONS.map(m => m.hotspot)).size === MISSIONS.length, 'mission hotspots unique');
ok(QUIZ.every(q => q.a[q.correct] !== undefined), 'every quiz question has a valid correct index');
MISSIONS.filter(m => m.choices && m.type !== 'multi').forEach(m => {
  ok(m.choices.filter(c => c.correct).length === 1, `${m.id}: exactly one correct choice`);
});
const m4 = MISSIONS.find(m => m.id === 'm4');
ok(m4.choices.filter(c => c.correct).length === 3, 'm4 has 3 correct actions');
const m5 = MISSIONS.find(m => m.id === 'm5');
ok(m5.correctOrder.join() === m5.steps.map(s => s.id).join(), 'm5 correct order matches step ids');

// --- scoring rules -----------------------------------------------------
S.resetState();
ok(S.state.points === 0 && S.state.attack === 0, 'fresh state starts at 0/0');

// simulate a perfect run
MISSIONS.forEach((m) => {
  const rec = S.missionRecord(m.id);
  rec.status = 'done';
  S.addPoints(m.points);
  S.markThreatStopped();
});
HUNT_TARGETS.forEach(() => S.markThreatStopped());
for (let i = 0; i < QUIZ.length; i++) S.addPoints(CONFIG.quizPointsPerQuestion);
ok(S.state.points === CONFIG.maxScore, `perfect run scores ${CONFIG.maxScore} (got ${S.state.points})`);
ok(S.state.threatsStopped === CONFIG.totalThreats, 'perfect run stops all 8 threats');
const pct = Math.round(S.state.points / CONFIG.maxScore * 100);
const rank = CONFIG.ranks.find(r => pct >= r.min);
ok(rank.name === 'Cyber Commander', `100% => Cyber Commander (got ${rank.name})`);

// rank bands
const band = (p) => CONFIG.ranks.find(r => p >= r.min).name;
ok(band(0) === 'Trainee' && band(39) === 'Trainee', '0-39% => Trainee');
ok(band(40) === 'Cyber Guardian' && band(69) === 'Cyber Guardian', '40-69% => Cyber Guardian');
ok(band(70) === 'Cyber Defender' && band(89) === 'Cyber Defender', '70-89% => Cyber Defender');
ok(band(90) === 'Cyber Commander' && band(100) === 'Cyber Commander', '90-100% => Cyber Commander');

// mission cannot be scored twice
S.resetState();
const rec = S.missionRecord('m1');
ok(S.isMissionResolved('m1') === false, 'mission starts unresolved');
rec.status = 'done'; S.addPoints(100);
ok(S.isMissionResolved('m1') === true, 'mission becomes resolved');
ok(S.state.points === 100, 'first award applied');

// attack meter clamps and fires gameover
S.resetState();
let gameovers = 0;
S.bus.on('gameover', () => gameovers++);
S.addAttack(150);
ok(S.state.attack === 100, 'attack meter clamps at 100');
ok(gameovers === 1, 'breach fires gameover once');
S.addAttack(-500);
ok(S.state.attack === 0, 'attack meter clamps at 0');

// drift maths: idling the full clock should not alone reach 100%
const drift = CONFIG.attackDriftPerSecond * CONFIG.missionTime;
ok(drift > 40 && drift < 100, `passive drift over a full run = ${drift.toFixed(0)}% (pressure without instant loss)`);

// best score persistence
S.resetState();
S.writeBest({ points: 400, percent: 53, rank: 'Cyber Guardian' });
S.writeBest({ points: 200, percent: 27, rank: 'Trainee' });
ok(S.readBest().points === 400, 'best score keeps the highest run');
S.writeBest({ points: 700, percent: 93, rank: 'Cyber Commander' });
ok(S.readBest().points === 700, 'best score updates on a better run');

// settings persistence
S.settings.reduceMotion = true; S.saveSettings();
ok(JSON.parse(localStorage.getItem(CONFIG.settingsKey)).reduceMotion === true, 'settings persist');

console.log(fails ? `\n${fails} FAILURE(S)` : '\nAll logic checks passed.');
process.exit(fails ? 1 : 0);
