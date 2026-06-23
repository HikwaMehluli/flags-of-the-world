/**
 * _entry.js — App entry point
 *
 * This is the first file Webpack loads. All it does is import the
 * modules that power each page. Each module checks whether its
 * required DOM elements exist before running, so they only activate
 * on the appropriate page (game board, scores page, etc.).
 *
 * ── Dependency tree ──────────────────────────────────────────────
 *
 * _entry.js (entry point - loaded by Webpack)
 * ├── navigation.js                   (all pages - sidebar menu; no deps)
 * ├── theme.js                        (all pages - dark/light mode; no deps)
 * ├── driver-js-theme.js              (game page - onboarding tour)
 * │   └── driver.js                   (npm)
 * ├── game.js                         (game page - main game logic)
 * │   ├── tippy.js                    (npm - card flag tooltips)
 * │   ├── flags-data.js               (flag JSON fetch + cache)
 * │   │   └── api/countries/flags_*.json  (remote)
 * │   ├── scores.js                   (IndexedDB storage + validation)
 * │   │   └── IndexedDB (FlagsOfTheWorldDB)
 * │   └── utils/toast.js              (toast notifications)
 * └── scores-display.js               (scores page - leaderboard)
 *     ├── scores.js                   (IndexedDB read + clear)
 *     │   └── IndexedDB (FlagsOfTheWorldDB)
 *     ├── flags-data.js               (country flag sync lookup)
 *     │   └── api/countries/flags_*.json  (remote)
 *     └── utils/toast.js              (success toast on clear)
 *
 * Legend:
 *   └── = imports from
 *   *    = shared module (imported by >1 file)
 *   npm  = external package (not a local file)
 */

// Sidebar menu toggle (all pages)
import './navigation.js';

// Dark/light theme toggle (all pages)
import './theme.js';

// Onboarding tour (game page only — checks for its own element)
import './driver-js-theme.js';

// Game board (game page only — checks for #game-board)
import './game.js';

// Scores display (scores page only — checks for .tab-button)
import './scores-display.js';
