# 🌍 Flags of the World Memory Game 🌍

![Flags of the World Memory Game Screenshot](./img/seo-image.jpg)

## An exciting and educational journey across the globe!
This project was born out of a desire to make learning about the world's diverse cultures and engaging experience's for ever being.

This memory game is more than just a game; it's an adventure that will test your knowledge and teach you about the beautiful flags of countries and regions from different continents. Get ready to challenge your memory, learn some geography, and have a blast doing it! - Hikwa Mehluli

## 📚 Libraries/Framework & Fetures
- 🚩 **Flag Icons:** A fantastic collection of SVG flags from [Flag Icons](https://flagicons.lipis.dev/).
- 💡 **Tippy.js:** For beautiful and accessible tooltips tool. [Tippy.JS](https://atomiks.github.io/tippyjs)
- 🎨 **SCSS/CSS:** Custom-built styling without heavy frameworks. Crafted with modern CSS practices for optimal performance and maintainability.

- Memory card game with flags from Africa, America, Asia, and Europe
- 3 difficulty levels (Easy, Medium, Hard)
- Combo tracking for consecutive matches
- Local scores stored in IndexedDB (offline-only, no server)
- Personal best detection with celebratory badge
- Dark/light theme toggle
- Onboarding tour (driver.js)
- Keyboard accessible

## 📷 Tech Stack

- Vanilla JS (ES modules, Webpack-bundled)
- Sass → CSS (compressed, no sourcemaps)
- IndexedDB (via custom `OfflineDB` wrapper)
- localStorage (theme, game state)
- tippy.js (tooltip library, npm/bundled)
- Google Analytics (anonymous only) 

## Architecture (File Tree)

```
js/
├── _entry.js              App entry — IndexedDB init, module imports
├── game.js                Orchestrator — wires state, renderer, matcher, timer
├── navigation.js          Sidebar menu toggle
├── theme.js               Dark/light theme switcher
├── scores-display.js      Scores page — local scores by continent tab
├── profile-stats.js       Stats page — game summary, per-continent stats
├── driver-js-theme.js     Onboarding tour theme helper
│
├── game/
│   ├── game-state-manager.js   State machine — cards, moves, matched pairs, combo
│   ├── game-renderer.js        Pure DOM rendering (no logic)
│   ├── card-matcher.js         Match logic with combo tracking
│   └── timer.js                MM:SS timer with pause/resume
│
├── score/
│   ├── score-manager.js        Score validation + IndexedDB storage
│   └── confirm-modal.js        Confirmation modal replacing native confirm()
│
├── db/
│   └── offline-db.js           IndexedDB wrapper (scores store)
│
└── utils/
    ├── time-utils.js           timeToSeconds, secondsToTime, formatTime
    ├── country-utils.js        Country dropdown population
    └── toast.js                Toast notification helper

api/
├── countries/
│   ├── flags_africa.json       Flag data — Africa
│   ├── flags_america.json      Flag data — America
│   ├── flags_asia.json         Flag data — Asia
│   └── flags_europe.json       Flag data — Europe
│
└── flags/                      Country flag SVGs (see Regions section for full list)
    ├── ad.svg
    ├── ae.svg
    ├── af.svg
    ├── ag.svg
    ├── ai.svg
    └── ...
```

### 🎮 Score Flow

```
Game Won → Modal (enter name + country) → ScoreManager.validate()
  → OfflineDB.addScore() → IndexedDB
       ↓
  isPersonalBest() → gold badge toast + confetti
```

All data stays on-device. No server, no sync, no accounts.

**Scores:** Every score is saved forever in IndexedDB. The Scores page shows the top 100 per continent tab, sorted by fewest moves then fastest time. You can filter by player name via a dropdown (populated alphabetically from stored scores), clear scores per continent (with a confirmation modal), or clear all scores. Each entry shows its rank (🥇🥇🥇 for podium, then `4.`, `5.`, ...). Score controls and the clear-all button are hidden when there are no scores to act on.

**Personal Best:** When you beat your previous best score on a continent + difficulty, a celebration fires with a gold badge toast and confetti.

### 🗂️ Pages

| Page | File | Content |
|------|------|---------|
| Play Game | `index.html` | Main memory game board |
| Game Rules | `game-rules.html` | Rules, scoring, combos explained |
| Scores | `scores.html` | Local scores by continent tab |
| Stats | `profile.html` | Career stats, per-continent breakdown |
| Fun Facts | `fun-facts.html` | Educational flag facts |
| Privacy Policy | `privacy-policy.html` | Offline-first privacy policy |

## 💻 Development

### Prerequisites

- Node.js (v16+)
- npm (v8+)

### Setup

```bash
git clone <repository-url>
cd flags-of-the-world
npm install
```

### Commands

| Command | Action |
|---------|--------|
| `npm start` | HTTP dev server (no cache) |
| `npm run css-build` | Sass watch → `dist/app.css` (compressed) |
| `npm run js-build` | Webpack watch → `dist/app.js` (production) |
| `npm run css:build` | Sass one-shot (CI use) |
| `npm run js:build` | Webpack one-shot (CI use) |

Watch commands (`css-build`, `js-build`) run in separate terminals.

### **⚠️ `<base>` Tag (GH Pages only) ⚠️**

All HTML pages include `<base href="/flags-of-the-world/">` in `<head>`. This is **required for GitHub Pages** so absolute paths like `/api/flags/dj.svg` resolve correctly under the `https://username.github.io/flags-of-the-world/` subdirectory.

**Local dev:** The `<base>` tag **must be removed or commented out** — `http-server` serves from root (`/`), so an incorrect `<base>` tag would break all icons, JS, and CSS paths. Comment/uncomment the `<base>` line in all 6 HTML files when switching between local dev and deployment.

### **⚡ HTTP Caching via `_headers`** (Deployed to GH Pages)

A `_headers` file at the repo root sets long HTTP cache lifetimes for static assets. This is server-side caching — completely independent of IndexedDB/localStorage, so clearing scores or browser storage won't affect it.

| Path | Cache Policy | Why |
|------|-------------|-----|
| `/api/flags/*` | 1 year, immutable | 270+ SVG flags, never change |
| `/api/countries/*` | 1 year, immutable | Flag JSON data, rarely change |
| `/dist/*` | 1 day | Rebuilt each deploy, moderate cache |
| `*.html` | `no-cache` | Always serve fresh HTML |

### **⚠️ Google Analytics ⚠️**

A Google tag (gtag.js) with ID `G-DH8L3Z163V` is hardcoded in the `<head>` of every HTML page. It loads on both local dev and production — no CI secrets or environment variables needed.

The old `js/analytics.js` module (injected via Webpack's `DefinePlugin`) has been removed in favor of this standard snippet. If you don't want GA during local development, comment out or remove the script block from the 6 HTML files.

## 🗺️ Regions included in the game
The game includes flags from various continents: Africa, Europe, Asia, and the Americas.

### Africa

- **North Africa:** Egypt, Libya, Tunisia, Algeria, Morocco, Sudan
- **Southern Africa:** South Africa, Zimbabwe, Botswana, Namibia, Zambia, Lesotho, Eswatini, Malawi
- **East Africa:** Kenya, Ethiopia, Tanzania, Uganda, Rwanda, Burundi, Somalia, Djibouti
- **West Africa:** Nigeria, Ghana, Senegal, Mali, Burkina Faso, Ivory Coast, Guinea, Sierra Leone, Liberia, Togo, Benin
- **Central Africa:** Cameroon, Chad, Central African Republic, Gabon, Equatorial Guinea, Rep. of Congo, DRC, Angola

### Europe

- **Northern Europe:** Denmark, Estonia, Finland, Iceland, Ireland, Latvia, Lithuania, Norway, Sweden, UK
- **Western Europe:** Austria, Belgium, France, Germany, Liechtenstein, Luxembourg, Monaco, Netherlands, Switzerland
- **Southern Europe:** Albania, Andorra, Bosnia, Croatia, Cyprus, Greece, Italy, Malta, Montenegro, North Macedonia, Portugal, Serbia, Slovenia, Spain
- **Eastern Europe:** Belarus, Bulgaria, Czech Republic, Hungary, Moldova, Poland, Romania, Slovakia, Ukraine

### Asia

- **Central Asia:** Kazakhstan, Kyrgyzstan, Tajikistan, Turkmenistan, Uzbekistan
- **Eastern Asia:** China, Hong Kong, Japan, Mongolia, North Korea, South Korea, Taiwan
- **South-Eastern Asia:** Brunei, Cambodia, Indonesia, Laos, Malaysia, Myanmar, Philippines, Singapore, Thailand, Vietnam
- **Southern Asia:** Afghanistan, Bangladesh, Bhutan, India, Iran, Maldives, Nepal, Pakistan, Sri Lanka
- **Western Asia:** Armenia, Azerbaijan, Bahrain, Cyprus, Georgia, Iraq, Israel, Jordan, Kuwait, Lebanon, Oman, Palestine, Qatar, Saudi Arabia, Syria, Turkey, UAE, Yemen

### America

- **Northern America:** Canada, United States
- **Caribbean:** Bahamas, Barbados, Cuba, Dominican Republic, Grenada, Haiti, Jamaica, Puerto Rico, Trinidad and Tobago
- **Central America:** Belize, Costa Rica, El Salvador, Guatemala, Honduras, Mexico, Nicaragua, Panama
- **South America:** Argentina, Bolivia, Brazil, Chile, Colombia, Ecuador, Guyana, Paraguay, Peru, Suriname, Uruguay, Venezuela

## License

MIT License. Copyright (c) 2025 Hikwa Mehluli.
