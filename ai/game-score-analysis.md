# Game Score Analysis

**Date:** 2026-06-22
**Last updated:** 2026-06-22

## Current Architecture

### Score Recording Flow

```
Game Won → Win Modal (enter name + country) → GameWon()
  → saveScore(name, moves, time, difficulty, region, playerCountry)
    → ScoreManager.validate() → validates name, moves, time, difficulty, continent
      → OfflineDB.addScore() → IndexedDB 'scores' store
        → Personal Best check via ScoreManager.isPersonalBest()
```

### IndexedDB Schema

**Database:** `FlagsOfTheWorldDB`, version `1`

**Store: `scores`**
| Field | Type | Notes |
|-------|------|-------|
| `id` | auto-increment | keyPath |
| `name` | string | sanitized, 2-50 chars |
| `moves` | integer | 1-999 |
| `time` | string | `"MM:SS"` |
| `difficulty` | string | `"easy"`, `"medium"`, `"hard"` |
| `continent` | string | `"africa"`, `"europe"`, `"asia"`, `"america"` |
| `region` | string (optional) | e.g. `"africa - Southern Africa"` |
| `playerCountry` | string (optional) | Player's country |
| `createdAt` | string | ISO 8601 |
| *Indexes* | | `continent`, `difficulty`, `name`, `createdAt` |

### Score Validation Rules

- Name: 2-50 chars, alphanumeric + spaces + `'-`, XSS-sanitized
- Moves: integer, 1-999
- Time: MM:SS format, 1 sec to 60 min
- Difficulty: `easy` | `medium` | `hard`
- Continent: `africa` | `europe` | `asia` | `america`

### Display Logic

- Scores page loads all scores for a continent via IndexedDB index
- Sorted by `moves` ascending, then `time` ascending
- Top 100 displayed per continent (capped)
- Rank numbers shown (🥇🥇🥇 for 1st-3rd, then `4.`, `5.`, ...)
- Player name filter input filters scores in real-time

## Identified Problems (Resolved)

| # | Problem | Resolution |
|---|---------|------------|
| 1 | No score limit — unbounded DOM rendering | Capped at 100 per continent |
| 2 | No way to clear scores | Added per-continent + clear-all buttons |
| 3 | Personal Best detected but no visual feedback | Gold badge toast + confetti |
| 4 | No per-player filtering | Added text input filter |
| 5 | No rank indicators | Added 🥇🥇🥇 + numeric ranks |
| 6 | `clearAllScores()` was broken (sync over async) | Fixed to `async` with `await` |

## Improvement Strategies Considered

| Strategy | Approach | Pros | Cons |
|----------|----------|------|------|
| **A. Minimal** | Display cap (top 50) + Clear button per continent | ~2 hrs work, immediate fix, user controls data | DB still grows unbounded |
| **B. Pruning** | Keep only top N per continent+difficulty, drop the rest | Bounded DB size, stays fast | Loses historical data permanently |
| **C. Per-player scoping** | Scores filtered by entered name, "Clear my scores" option | Personal best makes real sense, multi-user friendly | Text identity is fragile, more complex |
| **D. Hybrid (selected)** | Display cap (top 100) + keep all in DB + Clear buttons + rank numbers + player filter | Best UX, no data loss, user has full control | Slightly more work than A |

## Selected Strategy — D (Hybrid)

Rationale: IndexedDB handles thousands of records effortlessly (~150KB for 1000 scores). Keeping all data enables future features (charts, export, trends). The 100-entry cap keeps the UI fast and clean. Clear buttons give users control.

## Cross-Browser Compatibility

**IndexedDB support:**
- Chrome 24+ — full support
- Firefox 16+ — full support
- Safari 8+ (desktop + iOS) — full support
- Edge 12+ — full support
- iOS Safari private browsing: Works since iOS 13 (earlier versions may have quota issues)
- Android Chrome — full support

**No known issues** for the app's data volume (< 1MB even with years of play).

## localStorage Usage

| Key | Purpose |
|-----|---------|
| `darkMode` | Theme preference |
| `gameState` | Saved game state for resume |
| `highScores_{continent}` | Legacy fallback during IndexedDB migration |

## Implementation Details

### Changes Made

- **`js/scores-display.js`** — `.slice(0, 100)` cap, rank numbers with medal emojis, player name filter, clear button handlers
- **`scores.html`** — Added `.score-controls` div with filter input + clear button per tab, plus clear-all button
- **`js/game.js`** — Imported `showSuccessToast`, added `showConfetti()` method, PB toast celebration
- **`js/game/game-renderer.js`** — No changes needed (PB celebration is toast + confetti, not modal badge)
- **`js/score/score-manager.js`** — Fixed `clearAllScores()` to `async` with `await`
- **`scss/game-board.scss`** — Added `@keyframes confettiFall`
- **`game-rules.html`** — New page explaining rules, scoring, combos, data storage
- **`AGENTS.md`**, **`README.md`** — Updated to reflect all changes

## Future Considerations

- **Score export**: Download scores as CSV/JSON (low effort, high value for users)
- **Pagination**: If scores exceed 1000+, add pagination to scores page
- **Score charts**: Visualize improvement over time per player name
- **Multi-device sync**: Would require a backend (out of scope for offline-only app)
