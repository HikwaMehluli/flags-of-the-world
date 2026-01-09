# Flags of the World - AI Coding Guidelines

## Architecture Overview
This is a vanilla JavaScript memory game web app with modular SCSS styling. The core game logic resides in the `FlagsofWorld` class in `js/game.js`, which manages state, UI interactions, and dynamic flag data loading. Data flows from JSON files in `dist/` (fetched via `fetch()`), with scores persisted in localStorage. No frameworks—pure ES6 modules bundled by Webpack, CSS compiled from SCSS.

Key components:
- **Game Logic**: `js/game.js` - Handles card matching, timers, scoring.
- **UI Modules**: `js/navigation.js`, `js/theme.js`, `js/scores-display.js` - Manage sidebar, dark mode, leaderboards.
- **Styling**: SCSS files in `scss/` imported via `@use` in `_entry.scss`.
- **Data**: Flag SVGs in `api/flags/`, JSON metadata in `dist/` (continent-specific).

## Development Workflows
- **Build CSS**: `npm run css-build` (watches `scss/_entry.scss` → `dist/app.css` compressed).
- **Build JS**: `npm run js-build` (bundles `js/_entry.js` → `dist/app.js` with dotenv for GA).
- **Serve Locally**: `npm start` (http-server on port 8080, serves root with no cache).
- **GA Setup**: Set `GA_MEASUREMENT_ID` in `.env` for tracking; absent disables analytics.

## Code Patterns & Conventions
- **Modularity**: ES6 imports in `_entry.js`; SCSS `@use` for styles (e.g., `@use 'game-board';`).
- **Async Data**: Use `fetch()` for JSON loading, handle errors with try/catch (see `getFlags()` in `game.js`).
- **State Management**: Class properties for game state; localStorage for persistence (theme, scores by continent).
- **DOM Interaction**: Direct manipulation with `getElementById`, event listeners on `DOMContentLoaded`.
- **Naming**: Kebab-case for files (e.g., `game-board.scss`), camelCase for JS variables/methods.
- **Regions Logic**: When region has < required pairs, auto-add from other continent regions (e.g., North America + Caribbean for "Easy" 12 pairs).

## Examples
- **Adding UI Element**: In `game.js`, append to `this.gameBoard` with `createElement` and event listeners.
- **Styling Component**: Create `scss/new-feature.scss`, `@use` in `_entry.scss`, target classes like `.game-controls`.
- **Score Saving**: Use `localStorage.setItem(\`scores_\${continent}\`, JSON.stringify(scores))` in `saveScore()`.

Reference: `README.md` for features, `package.json` for scripts, `webpack.config.js` for build config.</content>
<parameter name="filePath">c:\Users\user\Documents\Digital Afros\App Development\Flags of the World\flags-of-the-world\.github\copilot-instructions.md