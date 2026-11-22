# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NUTRANTARA is a web-based learning game for high-school Biology (Grade XI, digestive system), built for Project Based Learning. A 3D multiplayer adventure (Three.js) with a teacher control panel. It runs on a classroom Node server, or as single-player from static hosting. All UI text, comments, and docs are in **Indonesian**. Keep new user-facing text and comments in Indonesian.

Requirements and scope come from `Desain_Game_NUTRANTARA.docx.md` (main design reference) and `Paket_Persiapan_Pengembangan_NUTRANTARA.docx.md`. `MEMORY.md` in the repo root logs the scope decisions: single-player → 0.3 multiplayer + teacher panel → 0.4 3D → 0.5 floating archipelago with accounts, lobby, map select, drop-in, and in-world missions → 0.6 bright "Nusantara Ceria" theme with Indonesian cultural props → 0.7 one-answer grading with post results and a report screen → 0.8 open world: six free-exploration islands, minimap, and sprint → 0.9 each post is its own open-world region of ±1000 × 650 m ("100 × 65 km" in the game's story) on a 32400×15200 map. Read it before changing scope. If the user changes scope, discuss the implications for platform, student data, operations, and cost before implementing. The game must stay original: genre inspiration is fine, copying characters, levels, or the look of an existing game is not.

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

- Classic: `missions.js` → `window.NUTRANTARA_MISSIONS`, `world-data.js` → `window.NUTRANTARA_WORLD`, `net.js` → `window.NutraNet`, `game.js` → `window.NutraGame`, `world.js` → `window.NutraWorld2D`, `map-art.js` (the "Peta" screen: positions the post pins that `game.js` renders over the illustration `assets/peta-nusantara*.webp`, and handles the route state, lock clouds, zoom, parallax, and Nara's speech bubble; it watches `#map-nodes` with a MutationObserver).
- Modules: `world3d.js` (→ `window.NutraWorld3D`, sets `NUTRA_WORLD_MODE`), `app.js` (app flow: login/register → lobby → island select → world; guest offline mode with no server), which import `characters.js`, `quest.js` (in-world terminals, report boards, seal altars, and the post-result card), `fx.js`, `region.js` (fills each post region: village hub, paths to every mission object and bridge, per-post InstancedMesh forests/bushes/rocks/flowers/grass, climbable terrace hills, ponds, cultural camps, kites, and 3 extra archive shards per post), `culture.js` (procedural Indonesian cultural props: candi bentar, meru, penjor, stupa, rumah gadang, gunungan, gong, ondel-ondel, kites, pinisi, local foods), and `vendor/three/three.module.min.js`.
- Styles: `styles.css` (base), `app.css` (app flow and world HUD), `landing.css`, `admin.css`, and `theme.css` loaded last on every page (the bright theme: kawung/tumpal patterns, Baloo 2 headings, teal-and-gold buttons). Put new visual styling in `theme.css`.
- Controls in the 3D world: WASD moves relative to the camera; ←/→ turn the facing direction, ↑/↓ move along it; R/F (or PageUp/PageDown) look up/down; Shift runs; M enlarges the minimap; the cursor sets the facing direction and a click on the ground walks there; a gold ground arrow shows the facing direction.
- `index.html` + `landing.js` is the landing page. `admin.html` + `admin.js` is the teacher panel.

**Shared data between browser and server.** `server.js` loads `missions.js` and `world-data.js` through `vm` with a fake `window` (`loadBrowserScript`). `test/smoke.js` does the same. These two files must stay plain scripts that only assign to `window.*`: no `import`/`export`, no DOM access. `missions.js` holds the challenge content **and the answer keys** (types: `single`, `multi`, `order`, `sort`).

**Scoring lives in two places that must agree.** Since 0.7 each challenge is answered **once** (`gradeChallenge` in `game.js`, used by both `submitAnswer` for the in-world board and the DOM mission screen): correct = 30 points, wrong = 0 points but the challenge still counts as complete, and the student moves on after seeing the correct answer and the explanation (the mission's `success` text). Seal +20; maximum 420. A post can be sealed once every challenge is answered (right or wrong) and the reason has `MIN_REASON` characters. The server re-validates the stored progress in `validateProgress` in `server.js`: it recomputes `correct` from the answer keys with `isCorrect` (it ignores the client's `correct` flag), sets points, and flags only invalid states, such as a seal with unanswered challenges or a challenge marked complete without a response (⚠ in the admin panel). Evaluation lives in `game.js` (`evaluatePost`, `evaluateAll`, `renderReport`): grades A ≥90%, B ≥75%, C ≥60%, otherwise D. The interim report grades only the posts already started. If you change scoring or challenge types, update both, plus the smoke test. Known limitation: the answer keys ship to the client. Post 1 has 100 case variants (`m.variants`, generated deterministically at the end of `missions.js`; variant 0 is the original). The student's variant lives in `posts[1].variant`: `applyVariants` in `game.js` copies it onto the mission object on every `saveState`, and `challengesFor` in `server.js` grades with that variant's keys. Do not change the generator's seed or lists, or saved progress will point to different cases.

**Server (`server.js`, single file, no framework).**
- Static files come from an explicit `STATIC` whitelist map. **New front-end files must be added there**, or they will 404 on the classroom server even though they work from `file://` or static hosting. The CSP is strict (`script-src 'self'`), so no inline scripts and no CDNs; Three.js is vendored for this reason and for offline LAN use.
- HTTP API: `/api/register`, `/api/login`, `/api/logout`, `/api/me`, `/api/status`, `/health`. Passwords use scrypt and auth is rate-limited per IP.
- WebSocket `/ws`: JSON messages keyed by `type`. Players send `join`, `move`, `progress`, `chat`, `zone`, `spawn` (with `to: playerId` it drops the player next to a squadmate), `emote`, `party` (`create`/`join`/`leave`: "Regu mabar" squads with a 6-character invite code, also accepted as the link `play.html?regu=CODE`; kept in server memory only, max 6 members, wrong codes rate-limited), and `ping`. The admin sends `admin-auth`, then `admin` with a sub-command (`set-paused`, `set-movement`, `set-posts`, `teleport`, `kick`, `reset-password`, `export`, …) and `admin-refresh`. The client side of the protocol lives in `net.js`, which emits events (`welcome`, `progress-sync`, `settings`, `reset`, …) that `game.js` subscribes to with `net.on`.
- Persistence: a single JSON file, `data/classroom.json` (gitignored), holding settings, players, and chat.

**Offline / fallback behaviour is a feature.** With no server, `net.js` reports it cannot connect and the game runs single-player, saving to `localStorage` (`nutrantara-save-v2:<user>` in `game.js`). Without WebGL, the game falls back to the 2D canvas world (`world.js`). World coordinates are a logical 32400×15200 map, 1 unit = 0.1 m in 3D (`world-data.js`: post regions 1–6 in a 3×2 grid, each an ellipse of 5000×3250 units; plaza island 0 at the junction of posts 1/2/3/6; `kind: 'wild'` exploration islands 7–12 in the gaps; bridges from big regions start at the nearest edge point), shared by the 2D world (which shows a 960×600 window that follows the player), the 3D world, the admin live map, and server teleport/spawn. Use `W.isPost(id)` rather than `id > 0` to detect a post. Mission objects in `quest.js` are placed relative to the region centre but capped to a ±220×140 m core (`sx`/`sz`); the rest of the region is free exploration. The 3D camera uses a close view range while playing (fog 110–330 m, far 800) and a far one in the map-select overview (`setView`); the compact minimap shows a ±320 m window around the player, M shows the whole map. Wild islands have no missions, are always in `allowedIslands`, and are reachable only by bridges whose other end is open. Their props, climbable platforms, and extra archive shards are defined in `LANDMARKS[7–12]` in `world3d.js`. New shards must be appended at the end of the list, because shard ids are list indexes stored in localStorage (order: plaza/post spots, wild-island shards, then region shards from `region.js`).

**Save schema:** if you change the shape of the `game.js` state, bump `SCHEMA_VERSION` (old saves are discarded when the version does not match).

## Constraints from the design docs

- Students use aliases, never full names. Chat is readable by the teacher.
- All numbers in Posts 1–5 are simulated data, not nutrition advice.
- Accessibility targets: keyboard (Tab/Enter), state never shown by color alone, 1024 px width, 125% zoom, touch, low-end laptops (the "3D Ringan" / 2D graphics options), and `prefers-reduced-motion` (respected in `fx.js`).
