# Flags of the World Memory Game - v2.0.0

> An exciting and educational journey across the globe!
>
> Challenge your memory, learn geography, and have fun! — *Hikwa Mehluli*

## Features

- Memory card game with flags from Africa, America, Asia, and Europe
- 3 difficulty levels (Easy, Medium, Hard)
- Combo tracking for consecutive matches
- Local scores stored in IndexedDB (offline-only, no server)
- Personal best detection with celebratory badge
- Dark/light theme toggle
- Onboarding tour (driver.js)
- Keyboard accessible

## Tech Stack

- Vanilla JS (ES modules, Webpack-bundled)
- Sass → CSS (compressed, no sourcemaps)
- IndexedDB (via custom `OfflineDB` wrapper)
- localStorage (theme, game state)
- tippy.js (tooltip library, npm/bundled)
- Google Analytics (anonymous only) 

## Architecture

```
js/
├── _entry.js              App entry — IndexedDB init, module imports
├── game.js                Orchestrator — wires state, renderer, matcher, timer
├── navigation.js          Sidebar menu toggle
├── theme.js               Dark/light theme switcher
├── scores-display.js      Scores page — local scores by continent tab
├── profile-stats.js       Stats page — game summary, per-continent stats
├── driver-js-theme.js     Onboarding tour theme helper
├── analytics.js           Google Analytics init
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

### Score Flow

```
Game Won → Modal (enter name + country) → ScoreManager.validate()
  → OfflineDB.addScore() → IndexedDB
       ↓
  isPersonalBest() → gold badge toast + confetti
```

All data stays on-device. No server, no sync, no accounts.

**Scores:** Every score is saved forever in IndexedDB. The Scores page shows the top 100 per continent tab, sorted by fewest moves then fastest time. You can filter by player name via a dropdown (populated alphabetically from stored scores), clear scores per continent (with a confirmation modal), or clear all scores. Each entry shows its rank (🥇🥇🥇 for podium, then `4.`, `5.`, ...). Score controls and the clear-all button are hidden when there are no scores to act on.

**Personal Best:** When you beat your previous best score on a continent + difficulty, a celebration fires with a gold badge toast and confetti.

### Pages

| Page | File | Content |
|------|------|---------|
| Play Game | `index.html` | Main memory game board |
| Game Rules | `game-rules.html` | Rules, scoring, combos explained |
| Scores | `scores.html` | Local scores by continent tab |
| Stats | `profile.html` | Career stats, per-continent breakdown |
| Fun Facts | `fun-facts.html` | Educational flag facts |
| Privacy Policy | `privacy-policy.html` | Offline-first privacy policy |

## Development

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

### **⚠️ Google Analytics Setup ⚠️** (This is only created github page upload)

GA is injected at build time by Webpack's `DefinePlugin`. The value of `process.env.GA_MEASUREMENT_ID` is replaced with the actual ID (or `''`) during compilation.

**Local dev:** GA is a no-op — the env var is unset, so `dist/app.js` gets `''` and no GA scripts load. No `.env` file needed.

**GitHub Pages (production):** The deploy workflow injects `GA_MEASUREMENT_ID` from a repository secret.

#### First-time setup (one-time)

1. **Add a repository secret** — In your repo on GitHub, go to Settings → Secrets and variables → Actions → New repository secret:
   - **Name:** `GA_MEASUREMENT_ID`
   - **Secret:** The GA measurement ID (e.g., `G-XXXXXXXXXX`)
2. **Change Pages source** — In Settings → Pages, set Source to **"GitHub Actions"** instead of "Deploy from a branch". The workflow in `.github/workflows/deploy.yml` handles the rest.
3. **Push to `main`** — The workflow will build with the GA ID and deploy to Pages.

## Regions

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
