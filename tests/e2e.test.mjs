/**
 * tests/e2e.test.mjs  -  OPTIONAL end-to-end smoke test.
 *
 * Plays the whole game in a headless browser and checks that every mission,
 * the finale, the results screen and the restart flow behave correctly, with
 * zero console errors.
 *
 * A-Frame is replaced by a small stand-in (tests/harness/aframe-shim.js) so
 * the test runs without a GPU or a network connection - it exercises the game
 * logic and the interface, not the 3D renderer.
 *
 * Setup (one off):
 *     npm install --no-save playwright
 *     npx playwright install chromium
 * Run:
 *     npm run test:e2e
 */

import pw from 'playwright';
const { chromium } = pw;
import http from 'http';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/tests/harness/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(8099, r));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
         '--disable-background-networking', '--disable-component-update', '--disable-sync',
         '--disable-default-apps', '--no-default-browser-check', '--metrics-recording-only',
         '--host-resolver-rules=MAP * 127.0.0.1, EXCLUDE 127.0.0.1']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(6000);

const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

await page.goto('http://127.0.0.1:8099/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__booted === true, { timeout: 15000 });

const step = async (label, fn) => {
  const before = consoleErrors.length;
  try { await fn(); } catch (err) { consoleErrors.push(`STEP "${label}" threw: ${err.message}`); }
  const newErrs = consoleErrors.slice(before);
  console.log((newErrs.length ? 'FAIL  ' : 'PASS  ') + label + (newErrs.length ? '\n        ' + newErrs.join('\n        ') : ''));
};

const text = (sel) => page.textContent(sel);
const click = async (sel) => { await page.waitForSelector(sel, { timeout: 5000 }); await page.click(sel); await page.waitForTimeout(120); };

await step('world builds + main menu renders', async () => {
  const title = await text('#overlayTitle');
  if (!/HIMALAYAN DATA VAULT/.test(title)) throw new Error('menu title missing: ' + title);
  const count = await page.evaluate(() => document.querySelectorAll('#world *').length);
  if (count < 200) throw new Error('world too small: ' + count + ' entities');
  console.log('        world entities:', count);
});

await step('settings screen opens and toggles', async () => {
  await click('#btnSettings');
  await click('.switch[data-key="reduceMotion"]');
  const on = await page.getAttribute('.switch[data-key="reduceMotion"]', 'aria-checked');
  if (on !== 'true') throw new Error('toggle did not flip');
  await click('.switch[data-key="reduceMotion"]');
  await click('#btnSettingsBack');
});

await step('start the run', async () => {
  await click('#btnStart');
  const chip = await text('#missionChip');
  if (chip.trim() !== 'MISSION 1') throw new Error('chip = ' + chip);
});

// ---- Mission 1: evidence + correct choice ----------------------------
await step('mission 1 opens from the office workstation', async () => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('hotspot-activate', { detail: { id: 'office-pc' } })));
  await page.waitForSelector('#evidenceGrid .evidence-card', { timeout: 4000 });
});
await step('mission 1 gates the decision until all evidence is found', async () => {
  const cards = await page.$$('#evidenceGrid .evidence-card');
  if (cards.length !== 4) throw new Error('expected 4 evidence cards, got ' + cards.length);
  await cards[0].click();
  if (await page.$('#choiceList')) throw new Error('choices appeared too early');
  for (let i = 1; i < cards.length; i++) await cards[i].click();
  await page.waitForSelector('#choiceList .choice', { timeout: 3000 });
});
await step('mission 1 correct answer scores 100', async () => {
  await click('#choiceList .choice[data-id="report"]');
  await page.waitForSelector('#btnContinue', { timeout: 3000 });
  const pts = await text('#statPoints');
  if (pts.trim() !== '100') throw new Error('points = ' + pts);
  const threats = await text('#statThreats');
  if (!threats.includes('1 / 8')) throw new Error('threats = ' + threats);
  await click('#btnContinue');
});

// ---- Mission 2: wrong answer path -----------------------------------
await step('mission 2 advances and a wrong answer raises the attack meter', async () => {
  const chip = await text('#missionChip');
  if (chip.trim() !== 'MISSION 2') throw new Error('chip = ' + chip);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('hotspot-activate', { detail: { id: 'usb-drive' } })));
  await page.waitForSelector('#choiceList .choice', { timeout: 4000 });
  const before = await page.evaluate(() => Number(document.getElementById('meterValue').textContent.replace('%', '')));
  await click('#choiceList .choice[data-id="plug"]');
  await page.waitForSelector('#btnContinue', { timeout: 3000 });
  const after = await page.evaluate(() => Number(document.getElementById('meterValue').textContent.replace('%', '')));
  if (after - before < 14) throw new Error(`meter only moved ${before} -> ${after}`);
  const pts = await text('#statPoints');
  if (pts.trim() !== '100') throw new Error('wrong answer awarded points: ' + pts);
  await click('#btnContinue');
});

await step('a resolved mission cannot be re-opened or re-scored', async () => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('hotspot-activate', { detail: { id: 'usb-drive' } })));
  await page.waitForTimeout(250);
  const dialogOpen = await page.evaluate(() => !document.getElementById('overlay').hasAttribute('hidden'));
  if (dialogOpen) throw new Error('resolved mission re-opened');
  const pts = await text('#statPoints');
  if (pts.trim() !== '100') throw new Error('points changed: ' + pts);
});

// ---- Mission 3: password --------------------------------------------
await step('mission 3 password puzzle scores the strong passphrase', async () => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('hotspot-activate', { detail: { id: 'staff-pc' } })));
  await page.waitForSelector('#choiceList .choice', { timeout: 4000 });
  const bars = await page.$$('.pw-strength');
  if (bars.length !== 4) throw new Error('expected 4 strength meters, got ' + bars.length);
  await click('#choiceList .choice[data-id="p4"]');
  await page.waitForSelector('#btnContinue', { timeout: 3000 });
  const pts = await text('#statPoints');
  if (pts.trim() !== '200') throw new Error('points = ' + pts);
  await click('#btnContinue');
});

// ---- Mission 4: multi-select ----------------------------------------
await step('mission 4 multi-select requires every safe action', async () => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('hotspot-activate', { detail: { id: 'wall-screen' } })));
  await page.waitForSelector('#evidenceGrid .evidence-card', { timeout: 4000 });
  for (const c of await page.$$('#evidenceGrid .evidence-card')) await c.click();
  await page.waitForSelector('#confirmMulti', { timeout: 3000 });
  if (!(await page.getAttribute('#confirmMulti', 'disabled') === '')) throw new Error('confirm enabled with nothing selected');
  for (const id of ['lock', 'report', 'nowifi']) await click(`#choiceList .choice[data-id="${id}"]`);
  await click('#confirmMulti');
  await page.waitForSelector('#btnContinue', { timeout: 3000 });
  const pts = await text('#statPoints');
  if (pts.trim() !== '350') throw new Error('points = ' + pts);
  await click('#btnContinue');
});

// ---- Mission 5: ordering --------------------------------------------
await step('mission 5 ordering puzzle scores a correct sequence', async () => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('hotspot-activate', { detail: { id: 'server-console' } })));
  await page.waitForSelector('#orderPool .choice', { timeout: 4000 });
  for (const id of ['s1', 's2', 's3', 's4']) await click(`#orderPool .choice[data-id="${id}"]`);
  await click('#confirmOrder');
  await page.waitForSelector('#btnContinue', { timeout: 3000 });
  const pts = await text('#statPoints');
  if (pts.trim() !== '550') throw new Error('points = ' + pts);
  await click('#btnContinue');
});

// ---- Finale ----------------------------------------------------------
await step('final Cyber Lockdown starts', async () => {
  await page.waitForSelector('#startHunt', { timeout: 4000 });
  await click('#startHunt');
  await page.waitForSelector('.hunt-tracker', { timeout: 4000 });
});
await step('finding the three hidden threats ends the hunt', async () => {
  for (const id of ['h-printer', 'h-tailgate', 'h-rogueap']) {
    await page.evaluate((i) => window.dispatchEvent(new CustomEvent('hotspot-activate', { detail: { id: i } })), id);
    await page.waitForTimeout(150);
  }
  await page.waitForSelector('#startQuiz', { timeout: 4000 });
  // Mission 2 was deliberately failed above, so 4 missions + 3 hidden = 7.
  const threats = await text('#statThreats');
  if (!threats.includes('7 / 8')) throw new Error('threats = ' + threats);
  await click('#startQuiz');
});
await step('final quiz runs all five questions', async () => {
  for (let q = 0; q < 5; q++) {
    await page.waitForSelector('#quizChoices .choice', { timeout: 4000 });
    const correct = await page.evaluate((i) => window.__quizCorrect ? window.__quizCorrect[i] : null, q);
    await page.click(`#quizChoices .choice[data-index="${correct}"]`);
    await page.waitForSelector('#quizNext', { timeout: 3000 });
    await page.click('#quizNext');
    await page.waitForTimeout(150);
  }
});
await step('results screen scores the run correctly', async () => {
  await page.waitForSelector('#btnPlayAgain', { timeout: 5000 });
  const title = (await text('#overlayTitle')).trim();
  if (title !== 'VAULT SECURED') throw new Error('title = ' + title);
  const values = await page.$$eval('.result-tile .r-value', (n) => n.map((x) => x.textContent.trim()));
  console.log('        results:', values.join(' | '));
  // 100 + 0 (failed) + 100 + 150 + 200 + 100 quiz = 650 of 750 = 87%
  if (values[0] !== '650') throw new Error('points = ' + values[0]);
  if (values[1] !== '87%') throw new Error('percent = ' + values[1]);
  if (values[2] !== '7/8') throw new Error('threats = ' + values[2]);
  if (values[3] !== '4/5') throw new Error('systems = ' + values[3]);
  const rank = (await text('.rank-name')).trim();
  if (rank !== 'Cyber Defender') throw new Error('rank = ' + rank);
  const debrief = await page.$$('.debrief li');
  if (debrief.length < 10) throw new Error('debrief too short: ' + debrief.length);
});
await step('play again restarts cleanly', async () => {
  await click('#btnPlayAgain');
  const pts = await text('#statPoints');
  if (pts.trim() !== '0') throw new Error('points not reset: ' + pts);
  const chip = await text('#missionChip');
  if (chip.trim() !== 'MISSION 1') throw new Error('chip = ' + chip);
});
await step('pause, help and area navigation work', async () => {
  await click('#btnPause');
  await page.waitForSelector('#btnResume', { timeout: 3000 });
  await click('#btnResume');
  await click('#btnHelp');
  await page.waitForSelector('#btnCloseHelp', { timeout: 3000 });
  await click('#btnCloseHelp');
  await click('#btnAudio');
  await click('#btnAudio');
  await click('.area-btn[data-area="server"]');
  await page.waitForTimeout(500);
  const cur = await page.getAttribute('.area-btn[data-area="server"]', 'class');
  if (!cur.includes('is-current')) throw new Error('area did not change: ' + cur);
});
await step('breach ending fires when the attack meter hits 100%', async () => {
  await page.evaluate(async () => {
    const s = await import('/src/game/state.js');
    s.addAttack(100, 'test');
  });
  await page.waitForSelector('#btnPlayAgain', { timeout: 4000 });
  const title = (await text('#overlayTitle')).trim();
  if (title !== 'VAULT BREACHED') throw new Error('title = ' + title);
});

console.log('\nconsole errors during the whole run:', consoleErrors.length);
if (consoleErrors.length) console.log(consoleErrors.slice(0, 25).join('\n'));

await browser.close();
server.close();
process.exit(consoleErrors.length ? 1 : 0);
