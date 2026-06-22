# Flags of the World

Vanilla JS memory game. Offline-only — local scores stored in IndexedDB.

## Commands

| Command | Action |
|---------|--------|
| `npm start` | HTTP dev server (no cache) |
| `npm run css-build` | Sass watch → `dist/app.css` (compressed, no sourcemaps) |
| `npm run js-build` | Webpack watch → `dist/app.js` (production mode, no HMR) |

Both watch commands must be run separately (two terminals). No single dev command.

## Architecture

- **Entry:** `js/_entry.js` — imports all modules, initializes IndexedDB
- **Orchestrator:** `js/game.js` — `FlagsofWorld` class wires GameStateManager, GameRenderer, CardMatcher, Timer together
- **Game modules** in `js/game/` — state machine, DOM renderer, match logic, timer
- **Score pipeline:** ScoreManager (local) → OfflineDB (IndexedDB); ConfirmModal (`js/score/confirm-modal.js`) replaces native `confirm()` for clear actions
- **Scores page** — top 100 per continent displayed, ranked (🥇🥇🥇 + numeric), player name dropdown filter (alphabetical, populated from IndexedDB), per-continent clear + clear-all button
- **Personal Best** — detected by ScoreManager, celebrated with gold badge toast + confetti
- **No test framework, no linter, no formatter** configured
- **tippy.js** npm package — replaces vendored `dist/popper.js` + `dist/tippy.js` script tags
- **No backend** — fully client-side, no auth, no Supabase

## Flag Data

JSON files live in `api/countries/`: `flags_africa.json`, `flags_america.json`, `flags_asia.json`, `flags_europe.json`. These are static — no generation script.

## Golden Rule

**Always KISS — no over-engineering. No classes, no abstractions, no frameworks unless proven necessary. Never add code you might need later — only code you need now.**

## Key Conventions

- **ES modules** with `import`/`export`, bundled by Webpack (not native)
- **Sidebar navigation** — 6 pages: index.html (Play Game), game-rules.html (Game Rules), scores.html, profile.html (local stats), fun-facts.html, privacy-policy.html
- **localStorage keys** used: `darkMode`, `gameState`, `highScores_{continent}` (legacy during migration)
- **IndexedDB** (OfflineDB) stores scores locally — no server sync
