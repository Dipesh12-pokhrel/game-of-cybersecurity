# Cyber Defence: Himalayan Data Vault

A browser-based, first-person 360° cyber security awareness game for **warehouse and logistics staff**.

Built for **Assignment Executive** with HTML, CSS, JavaScript and [A-Frame](https://aframe.io).

> **This is a fictional training simulation.** Himalayan Data Vault, every staff member in it and
> "The Phantom Hacker" are invented for this exercise. There are no real people, real organisations,
> real faces, real data, weapons, violence or hacking instructions anywhere in the project. The game
> only teaches players how to **recognise and safely report** everyday workplace threats.

---

## 1. Quick start

You need [Node.js](https://nodejs.org) 18 or newer. Nothing else.

### One click (recommended)

| Your computer | Do this |
| --- | --- |
| **Windows** | Double-click **`START-GAME.bat`** |
| **macOS / Linux** | Run `chmod +x start-game.sh` once, then double-click or run `./start-game.sh` |

The launcher checks that Node.js is installed, saves an offline copy of A-Frame into
`public/vendor/`, installs Vite the first time (about a minute, once only), then starts the local
server and opens the game in your browser. Keep the window open while you play; `Ctrl+C` stops the
server.

**It cannot leave you stuck.** If `npm install` fails — offline, a company proxy, a blocked
package — the launcher clears the npm cache, retries once, and if that still fails it falls back to
the built-in server (`serve.mjs`) and starts the game anyway. The game is written as plain ES
modules with a plain stylesheet, so it needs no build step at all; Vite is only there for hot
reloading while you edit. If Node.js itself is missing, the launcher says so and waits, rather than
flashing and closing.

### Or from a terminal

```bash
npm install     # installs Vite (the dev server) - about 10 MB
npm run dev     # starts the game at http://localhost:5173 and opens your browser
```

If `npm install` will not work on your network, you do not need it:

```bash
npm run serve   # or simply:  node serve.mjs
```

`serve.mjs` is a small dependency-free static server included in the project. The game runs exactly
the same through it — you just lose hot reloading while editing.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local development server with hot reload |
| `npm run build` | Static production build in `dist/` — this is what Vercel runs (§8) |
| `npm run preview` | Serve the production build locally |
| `npm run serve` | Run the game with **no build step at all** (zero dependencies) |
| `npm test` | Run the headless rule checks (scoring, ranks, attack meter) |
| `npm run test:e2e` | Optional full play-through in a headless browser (§7) |

The dev server is started with `host: true`, so you can also open the printed
network address on a phone or tablet on the same Wi‑Fi to test the touch controls.

---

## 2. The game

### Story

The Himalayan Data Vault is a fictional hill-city warehouse storing delivery, stock and staff
records. A fictional attacker called **The Phantom Hacker** is trying to steal that information and
publish it online. The player is the **Cyber Defence Commander** and has ten minutes to complete
five missions before the **Cyber Attack Meter** reaches 100%.

### Areas

| # | Area | What is in it |
| --- | --- | --- |
| 1 | **Warehouse Office** | Workstations, wall display, printer, filing cabinets, window onto the hills |
| 2 | **Loading Bay** | Pallet racking, delivery scanner, pallet truck, roller shutter, fire door |
| 3 | **Staff Room** | Lockers, kitchenette, shared workstation, noticeboard |
| 4 | **Server Room** | Server racks, cable trays, incident console, alert beacons |

### Missions

| # | Mission | Area | Skill | Points | Wrong answer |
| --- | --- | --- | --- | --- | --- |
| 1 | **Red Alert Email** | Office | Spot four phishing red flags, then report the email | 100 | +15% attack |
| 2 | **USB Trap** | Loading Bay | Hand an unknown USB drive to IT without connecting it | 100 | +15% attack |
| 3 | **Password Vault** | Staff Room | Choose the strongest passphrase and remove the sticky note | 100 | +15% attack |
| 4 | **Social Media Leak** | Office | Trace the cause, then pick **every** safe response | 150 | +20% attack |
| 5 | **Server Room Lockdown** | Server Room | Order the incident-response steps: stop → disconnect → report → preserve | 200 | +20% attack |

### Final battle — Cyber Lockdown

* **60 seconds** to find three remaining threat hotspots hidden across the site
  (a propped fire door, documents left on a printer, a rogue Wi‑Fi access point).
* A **five-question assessment**, 20 Defence Points each.

The Phantom Hacker only ever appears as fictional on-screen text and a distorted synthesised tone —
never as a person.

### Scoring

Maximum score is **750 points** (650 from missions + 100 from the final assessment).

| Final percentage | Rank |
| --- | --- |
| 0–39% | Trainee |
| 40–69% | Cyber Guardian |
| 70–89% | Cyber Defender |
| 90–100% | Cyber Commander |

The end screen shows Defence Points, percentage, threats stopped, systems protected, time remaining
and your rank, plus a full debrief of every decision. Your best score is saved in `localStorage` on
that device.

A mission can only ever be answered — and scored — **once**.

---

## 3. Controls

### Desktop

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Mouse | Look around (click once to capture the mouse, `Esc` to release) |
| Click | Select whatever the crosshair is on |
| `1`–`9` | Choose an answer in a dialog |
| `Shift` + `1`–`4` | Jump to Office / Loading Bay / Staff Room / Server Room |
| `P` | Pause |
| `M` | Mute / unmute |
| `H` | Controls and settings |
| `Esc` | Close a dismissible dialog / release the mouse |

### Phone and tablet

* Drag anywhere to look around (and tilt the device — magic-window tracking is on).
* Use the on-screen stick, bottom-left, to walk.
* Press **SELECT**, bottom-right, to activate whatever is in the crosshair.
* The **Areas** panel is hidden on very small screens — use the doors on the front wall instead.

---

## 4. Accessibility

Open **Accessibility & comfort** from the main menu, the pause screen or the `?` button.

| Option | Effect |
| --- | --- |
| **Audio** | Turns all sound off. Nothing is lost — every audio cue also appears as a caption. |
| **Subtitles** | Captions for spoken NPC lines, Phantom transmissions and audio cues. On by default. |
| **Reduce motion** | Stops pulsing, bobbing, head movement, screen animation and glitch effects. Automatically pre-enabled if your operating system requests reduced motion. |
| **High contrast** | Removes the scan-line overlay and strengthens text contrast. |
| **Reduce time pressure** | Stops the attack meter rising on its own, so players can take as long as they need. Wrong answers still count. |

Also built in:

* Every interactive control is a real `<button>`, reachable by keyboard, with a visible focus ring.
* Dialogs trap focus, are labelled with `aria-modal` / `aria-labelledby`, and close with `Escape`.
* The attack meter is a labelled `role="progressbar"`; score, threats and meter changes are announced with `aria-live`.
* Text sits on solid panels at WCAG AA contrast, and `prefers-reduced-motion` is respected even before the setting is touched.
* Nothing in the game depends on colour alone — every state also has a symbol or a word.
* The game can be paused at any time, and there is no fail state that cannot be retried.

---

## 5. Project structure

```
.
├── START-GAME.bat          # One-click launcher for Windows
├── PUSH-TO-GITHUB.bat      # One-click publish to GitHub, ready for Vercel (§8)
├── start-game.sh           # One-click launcher for macOS / Linux
├── serve.mjs               # Zero-dependency static server (no build step needed)
├── vercel.json             # Hosting configuration (see section 8)
├── scripts/
│   └── vendor-aframe.mjs   # Saves A-Frame into public/vendor before a build
├── index.html              # The scene skeleton + the HUD markup. Opens straight into the game.
├── vite.config.js          # Dev server / build configuration
├── package.json
├── README.md
├── tests/
│   ├── logic.test.mjs      # Headless rule checks (npm test)
│   ├── e2e.test.mjs        # Optional full play-through (npm run test:e2e)
│   └── harness/            # A-Frame stand-in used only by the e2e test
└── src/
    ├── main.js             # Entry point: waits for A-Frame, boots the game
    ├── style.css           # The whole interface: HUD, dialogs, crosshair, responsive rules
    ├── components/
    │   └── index.js        # Custom A-Frame components (hotspot, live-screen, npc, ...)
    └── game/
        ├── config.js       # All tuning values: timings, points, ranks, area layout
        ├── state.js        # Single source of truth + the clock + localStorage
        ├── missions.js     # ALL mission text, the hidden threats and the final quiz
        ├── world.js        # Procedurally builds the four areas
        ├── textures.js     # Every texture and screen, drawn on a <canvas>
        ├── audio.js        # Web Audio synthesis + subtitles
        ├── hud.js          # Score, attack meter, timer, mission panel, toasts
        ├── modal.js        # The reusable dialog (focus trapping, keyboard)
        ├── game.js         # Mission flow, scoring, navigation, end screens
        └── final.js        # The Cyber Lockdown hunt and the final assessment
```

### Where to change things

| I want to… | Edit |
| --- | --- |
| Reword a mission, add a red flag, change a quiz question | `src/game/missions.js` |
| Change points, timings, rank bands, the attack-meter curve | `src/game/config.js` |
| Move furniture, add props, add a new area | `src/game/world.js` |
| Change colours, fonts, HUD layout | the `:root` tokens at the top of `src/style.css` |
| Add a new kind of interactive object | `src/components/index.js` |

---

## 6. Replacing the assets

The project deliberately ships with **no binary assets**. Every surface, screen, sign and character
is drawn at runtime, so there is nothing to license, download or attribute. When you want real
artwork, each of these is a drop-in replacement.

### 6.1 Real textures instead of procedural ones

`src/game/textures.js` exports one function per surface (`concreteFloor()`, `steelPanel()`,
`rackFace()`, `cardboard()`, …). Each returns a `<canvas>`. To use an image instead, drop the file
into `public/textures/` and change the `tex` component usage in `src/game/world.js`:

```html
<!-- before -->
<a-plane tex="kind: concrete; repeat: 7 5"></a-plane>

<!-- after -->
<a-plane material="src: /textures/floor.jpg; repeat: 7 5"></a-plane>
```

Anything placed in `public/` is served from the site root, in both `npm run dev` and `npm run build`.

### 6.2 A real 360° photograph instead of the generated sky

Put an equirectangular JPG in `public/360/` and change the sky in `index.html`:

```html
<a-sky id="sky" radius="400" src="/360/warehouse.jpg"></a-sky>
```

…then delete the `applySky()` block near the bottom of `src/game/world.js` so it does not overwrite
your image. To build a *photo-based* 360 tour instead of the 3D rooms, give each area its own
`<a-sky>` image and swap `src` inside `teleportTo()`.

### 6.3 Real 3D models instead of primitive-built props

Place `.glb` / `.gltf` files in `public/models/` and replace a prop in `src/game/world.js`:

```js
mk('a-entity', {
  position: '1.6 0 -1.2',
  'gltf-model': '/models/scanner.glb',
  scale: '1 1 1'
}, area);
```

Keep the `hotspot` component on whatever mesh should stay clickable.

### 6.4 Real character models instead of the stylised staff

`src/components/index.js` contains the `npc` component, which builds each staff member from boxes
and spheres. Swap the body parts for a `gltf-model` and keep the `say()` method — the mission flow
calls it by name (`npcSay('anjali', '…')`). Please keep any replacement **fictional and adult**;
do not use photographs or likenesses of real people.

### 6.5 Recorded audio instead of synthesised audio

`src/game/audio.js` synthesises every sound with the Web Audio API. To use recordings, add files to
`public/audio/` and replace the body of the relevant `sfx.*` function with an `Audio` element or an
A-Frame `sound` component. Keep calling `subtitle()` alongside every new cue so the game stays
usable with sound off.

---

## 7. Tests

```bash
npm test        # always available, no extra setup
```

`tests/logic.test.mjs` runs in plain Node with no test framework. It checks the things that are easy
to break by accident: the five missions plus the quiz add up to exactly 750 points, the rank bands
line up with 0/40/70/90%, a mission can never be scored twice, the attack meter clamps at 0 and 100
and fires the breach ending exactly once, and the best score only ever moves up.

```bash
npm install --no-save playwright
npx playwright install chromium
npm run test:e2e
```

The optional end-to-end test plays the entire game in a headless browser: every mission type, a
deliberately wrong answer, the Cyber Lockdown hunt, the five-question assessment, the results screen,
Play Again and the breach ending - asserting the score after each step and requiring zero console
errors. It swaps A-Frame for a small stand-in (`tests/harness/aframe-shim.js`) so it needs no GPU,
which means it tests the game logic and the interface rather than the 3D renderer.

---

## 8. Hosting it online (Vercel)

The game is a static site, so Vercel serves it with no server, no database and no
configuration to fill in. `vercel.json` is already in the project.

### The easy route - GitHub, then import

1. Create an **empty** repository at <https://github.com/new> (leave "Add a README file"
   unticked), then double-click **`PUSH-TO-GITHUB.bat`** and paste the repository URL when
   it asks. It sets up git, commits everything and pushes.

   The same thing by hand, if you prefer:

   ```bash
   git init
   git add .
   git commit -m "Cyber Defence: Himalayan Data Vault"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

   Run `PUSH-TO-GITHUB.bat` again any time to publish later changes.

2. Go to <https://vercel.com/new>, sign in, and pick that repository.
3. Leave every setting alone — Vercel reads `vercel.json` and already knows:
   framework **Vite**, build command `npm run build`, output directory `dist`.
4. Press **Deploy**. About a minute later you get a URL like
   `https://cyber-defence-himalayan-data-vault.vercel.app`.

Every later `git push` redeploys automatically, so updating the game is one command.

### The quick route - command line, no GitHub

From inside the project folder:

```bash
npx vercel          # first run asks you to sign in, then creates a preview URL
npx vercel --prod   # publishes to the live URL
```

### What the build does

`npm run build` runs `scripts/vendor-aframe.mjs` first, which saves a copy of A-Frame
into `public/vendor/`. The deployed page still tries the CDN first, but if a visitor's
network blocks `aframe.io` — common on warehouse and corporate networks — the browser
silently falls back to the copy served from your own Vercel domain. If the download
fails during the build, the script logs a warning and the build carries on.

### If the build ever fails

The game does not actually need a build step, so you can deploy the raw files instead.
Replace the top of `vercel.json` with:

```json
{
  "framework": null,
  "buildCommand": "echo no build needed",
  "outputDirectory": ".",
  "rewrites": [{ "source": "/vendor/:path*", "destination": "/public/vendor/:path*" }],
```

…and delete the `.vercelignore` entries you still want served. Vercel then publishes
`index.html` and `src/` exactly as they are, which is the same thing `npm run serve`
does locally.

### Things worth knowing

- The site is fully static, so Vercel's free Hobby plan is enough.
- Scores and settings are stored in each visitor's own browser (`localStorage`). Nothing
  is sent anywhere, and there is no backend to secure.
- Add a custom domain under **Project → Settings → Domains** if you want one.

---

## 9. Running fully offline

**This is already handled for you.** `index.html` loads A-Frame from the official CDN, and if that
request fails — no internet, or a company firewall — it automatically falls back to a local copy at
`public/vendor/aframe.min.js`. The launchers in §1 create that copy on first run, so the game keeps
working in a classroom, an assessment centre or a warehouse with locked-down networking.

A-Frame is deliberately **not** an npm dependency. It is a single file loaded by a `<script>` tag,
and pulling it through npm would drag in a GitHub-hosted sub-dependency that fails on many
corporate networks. The launcher downloads that one file directly instead.

To create the local copy by hand (if you started from a terminal rather than the launcher):

```bash
mkdir -p public/vendor
curl -fsSL -o public/vendor/aframe.min.js https://aframe.io/releases/1.7.0/aframe.min.js
```

Or just download <https://aframe.io/releases/1.7.0/aframe.min.js> in your browser and save it as
`public/vendor/aframe.min.js`. The folder is git-ignored, because it is generated.

If you would rather skip the CDN entirely, delete the first `<script>` tag in `index.html` and
change the fallback into a plain tag:

```html
<script src="./vendor/aframe.min.js"></script>
```

---

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `npm warn tarball ... three-bmfont-text ... seems to be corrupted` | Your network cannot fetch GitHub tarballs. Nothing to fix — A-Frame is no longer an npm dependency, so a current `npm install` never requests that package. If you saw this on an older copy, delete `node_modules` and `package-lock.json`, then run the launcher again. |
| `npm install` fails for any other reason | Ignore it and run `npm run serve` (or `node serve.mjs`). The game needs no build step; only hot reloading is lost. |
| `START-GAME.bat` flashes and closes instantly | It should not — it pauses on every error. If it does, open a terminal in this folder and run `npm install` followed by `npm run dev` to see the message. |
| Boot screen says *"A-Frame could not be loaded"* | The CDN is blocked **and** there is no local copy. Run the launcher once (§1), or follow **§9 Running fully offline**. |
| The mouse does not capture | Some browsers block pointer lock until you click inside the page. Click once on the 3D view. Drag-to-look works either way. |
| No sound | Browsers block audio until you interact with the page — click anywhere. Check the `M` toggle and the **Audio** setting. |
| Very low frame rate on an old laptop | Turn on **Reduce motion** in the settings; it stops all per-frame screen redraws and idle animation. |
| Blank page after `npm run build` | Open the build through `npm run preview` rather than double-clicking `dist/index.html` — browsers block ES modules on `file://`. |
| Behind a corporate proxy | Set your registry proxy (`npm config set proxy …`), or skip npm entirely with `npm run serve`. |

---

## 11. Safety and content notes

* Every organisation, person, email address, handle and domain in the game is invented.
  All domains use the reserved `.example` suffix, which can never resolve to a real website.
* There is no violence, no weapon, no harm to any character, and no way to attack an NPC.
  The staff members exist only to point out problems and ask for help.
* Nothing in the game explains how to perform an attack. The phishing email, the USB drive and the
  malware warning are shown purely so players learn to **recognise and report** them.
* The Phantom Hacker is a fictional on-screen voice, deliberately never depicted as a person.
* No personal data is collected. The only things stored are your own best score and your
  accessibility settings, both in your browser's `localStorage`, both removable by clearing site data.

## 12. Licence

Source code: MIT. All assets are generated at runtime by the code in this repository, so there are
no third-party asset licences to track. A-Frame is MIT licensed.
