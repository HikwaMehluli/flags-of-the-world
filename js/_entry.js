/**
 * _entry.js — App entry point
 *
 * This is the first file Webpack loads. All it does is import the
 * modules that power each page. Each module checks whether its
 * required DOM elements exist before running, so they only activate
 * on the appropriate page (game board, scores page, etc.).
 *
 * File structure:
 *   _entry.js          ← YOU ARE HERE
 *   game.js             Main memory game (game-board page)
 *   scores.js           Score storage + validation (IndexedDB)
 *   flags-data.js       Flag JSON fetching + caching (shared)
 *   scores-display.js   Scores page (scores.html)
 *   navigation.js       Sidebar menu (all pages)
 *   theme.js            Dark/light mode (all pages)
 *   driver-js-theme.js  Onboarding tour (game-board page only)
 *   utils/toast.js      Toast notifications (used by game.js)
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
