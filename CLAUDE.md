# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NUTRANTARA is a web-based learning game for high-school Biology (Grade XI, digestive system), built for Project Based Learning. A 3D multiplayer adventure (Three.js) with a teacher control panel. It runs on a classroom Node server, or as single-player from static hosting. All UI text, comments, and docs are in **Indonesian**. Keep new user-facing text and comments in Indonesian.

Requirements and scope come from `Desain_Game_NUTRANTARA.docx.md` (main design reference) and `Paket_Persiapan_Pengembangan_NUTRANTARA.docx.md`. `MEMORY.md` in the repo root logs the scope decisions: single-player → 0.3 multiplayer + teacher panel → 0.4 3D. Read it before changing scope. If the user changes scope, discuss the implications for platform, student data, operations, and cost before implementing. The game must stay original: genre inspiration is fine, copying characters, levels, or the look of an existing game is not.

## Commands

```bash
npm install          # ws (runtime) + three (dev, only used to refresh vendor/)
npm start            # classroom server on :3000 — prints player URL, /admin URL, and admin PIN
npm test             # test/smoke.js: spawns server.js on port 3999 with a temp data dir, drives accounts/2 players/admin over WebSocket
npm run vendor       # copy three.module.min.js from node_modules into vendor/three/
for f in *.js test/*.js; do node --check "$f"; done   # syntax check (what CI runs)
```

There is no build step, bundler, or linter. `npm test` is the only test: one script with sequential `ok(cond, label)` assertions. To test a single behaviour, add or edit assertions there. There is no per-test runner.

Env vars: `PORT`, `NUTRANTARA_ADMIN_PIN` (random each start if unset; **required** when `NODE_ENV=production`, otherwise the server exits), `NUTRANTARA_MAX_PLAYERS` (60), `NUTRANTARA_DATA_DIR` (`data/`), `TRUST_PROXY=1` (use X-Forwarded-For for rate limiting). CI (`.github/workflows/blank.yml`) runs the syntax check, `npm test`, and a Docker build plus a `/health` check. For deployment (Docker, Render), see `docs/DEPLOY.md`.

## Architecture

**No build, plain browser scripts plus ES modules.** `play.html` loads classic `defer` scripts that publish globals, followed by ES modules that read those globals:

- Classic: `missions.js` → `window.NUTRANTARA_MISSIONS`, `world-data.js` → `window.NUTRANTARA_WORLD`, `net.js` → `window.NutraNet`, `game.js` → `window.NutraGame`, `world.js` → `window.NutraWorld2D`.
- Modules: `world3d.js` (→ `window.NutraWorld3D`, sets `NUTRA_WORLD_MODE`), `app.js` (app flow: login/register → lobby → island select → world; guest offline mode with no server), which import `characters.js`, `quest.js` (in-world terminals, report boards, and seal altars per post), `fx.js`, and `vendor/three/three.module.min.js`.
- `index.html` + `landing.js` is the landing page. `admin.html` + `admin.js` is the teacher panel.

**Shared data between browser and server.** `server.js` loads `missions.js` and `world-data.js` through `vm` with a fake `window` (`loadBrowserScript`). `test/smoke.js` does the same. These two files must stay plain scripts that only assign to `window.*`: no `import`/`export`, no DOM access. `missions.js` holds the challenge content **and the answer keys** (types: `single`, `multi`, `order`, `sort`).

**Scoring lives in two places that must agree.** The client computes the score in `game.js` (`submitAnswer` / `sealPost`): 30 points on the first try, −5 per retry, minimum 10; seal +20; maximum 420. The server re-validates the stored progress in `validateProgress` in `server.js` (`checkResponse` per challenge type, `MIN_REASON` passport reason length). It overrides the score and flags invalid seals (⚠ in the admin panel). If you change scoring or challenge types, update both, plus the smoke test. Known limitation: the answer keys ship to the client.

**Server (`server.js`, single file, no framework).**
- Static files come from an explicit `STATIC` whitelist map. **New front-end files must be added there**, or they will 404 on the classroom server even though they work from `file://` or static hosting. The CSP is strict (`script-src 'self'`), so no inline scripts and no CDNs; Three.js is vendored for this reason and for offline LAN use.
- HTTP API: `/api/register`, `/api/login`, `/api/logout`, `/api/me`, `/api/status`, `/health`. Passwords use scrypt and auth is rate-limited per IP.
- WebSocket `/ws`: JSON messages keyed by `type`. Players send `join`, `move`, `progress`, `chat`, `zone`, `spawn`, `emote`, `ping`. The admin sends `admin-auth`, then `admin` with a sub-command (`set-paused`, `set-movement`, `set-posts`, `teleport`, `kick`, `reset-password`, `export`, …) and `admin-refresh`. The client side of the protocol lives in `net.js`, which emits events (`welcome`, `progress-sync`, `settings`, `reset`, …) that `game.js` subscribes to with `net.on`.
- Persistence: a single JSON file, `data/classroom.json` (gitignored), holding settings, players, and chat.

**Offline / fallback behaviour is a feature.** With no server, `net.js` reports it cannot connect and the game runs single-player, saving to `localStorage` (`nutrantara-save-v2:<user>` in `game.js`). Without WebGL, the game falls back to the 2D canvas world (`world.js`). World coordinates are a logical 960×600 map (`world-data.js`: central plaza island 0 plus post islands 1–6 linked by bridges), shared by the 2D world, the 3D world, the admin live map, and server teleport/spawn.

**Save schema:** if you change the shape of the `game.js` state, bump `SCHEMA_VERSION` (old saves are discarded when the version does not match).

## Constraints from the design docs

- Students use aliases, never full names. Chat is readable by the teacher.
- All numbers in Posts 1–5 are simulated data, not nutrition advice.
- Accessibility targets: keyboard (Tab/Enter), state never shown by color alone, 1024 px width, 125% zoom, touch, low-end laptops (the "3D Ringan" / 2D graphics options), and `prefers-reduced-motion` (respected in `fx.js`).
