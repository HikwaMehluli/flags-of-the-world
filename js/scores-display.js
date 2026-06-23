/**
 * scores-display.js — Shows saved scores on the Scores page
 *
 * This runs on scores.html. It:
 *   1. Loads scores from IndexedDB for each continent tab
 *   2. Lets you filter by player name
 *   3. Shows the top 100 scores per continent (sorted by moves → time)
 *   4. Allows clearing scores per continent (with a confirmation modal)
 *
 * All score data comes from js/scores.js, and flag data comes from js/flags-data.js.
 *
 * @module scores-display
 */

import { getScores, clearScores, showConfirmModal } from './scores.js';
import { getAllFlagData, getCountryFlagSync } from './flags-data.js';
import { showSuccessToast } from './utils/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
	const tabButtons = document.querySelectorAll('.tab-button');
	const tabContents = document.querySelectorAll('.tab-content');
	const continentScoreLists = document.querySelectorAll('.continent-scores-list');
	const noScoresContainers = document.querySelectorAll('.no-scores-container');

	if (tabButtons.length === 0 || continentScoreLists.length === 0) return;

	// Preload flag data so sync lookups work later (for player country flags)
	await getAllFlagData();

	// ---- Tab switching ----
	tabButtons.forEach(button => {
		button.addEventListener('click', async () => {
			tabButtons.forEach(btn => btn.classList.remove('active'));
			button.classList.add('active');

			tabContents.forEach(content => { content.style.display = 'none'; });

			const continent = button.getAttribute('data-tab');
			document.getElementById(`${continent}-tab`).style.display = 'block';
			await loadScoresForContinent(continent);
		});
	});

	// ---- Player filter ----
	document.querySelectorAll('.player-filter').forEach(select => {
		select.addEventListener('change', () => {
			loadScoresForContinent(select.getAttribute('data-continent'));
		});
	});

	// ---- Clear scores ----
	document.querySelectorAll('.clear-scores').forEach(btn => {
		btn.addEventListener('click', async () => {
			const continent = btn.getAttribute('data-continent');
			const confirmed = await showConfirmModal(`Clear all scores for ${continent}? This cannot be undone.`);
			if (confirmed) {
				await clearScores(continent);
				showSuccessToast(`Scores for ${continent} cleared.`);
				loadScoresForContinent(continent);
			}
		});
	});

	// Load default tab (Africa)
	await loadScoresForContinent('africa');
});

// ============================================================
//  LOAD & DISPLAY SCORES
// ============================================================

/**
 * Fetch scores from IndexedDB for a given continent and render them.
 * Also updates the player name filter dropdown and the clear-scores button visibility.
 *
 * @param {string} continent - 'africa', 'europe', 'asia', or 'america'
 */
async function loadScoresForContinent(continent) {
	try {
		const scores = await getScores(continent);

		const scoreList = document.querySelector(`.continent-scores-list[data-continent="${continent}"]`);
		const noScores = document.querySelector(`.no-scores-container[data-continent="${continent}"]`);
		const filterSelect = document.querySelector(`.player-filter[data-continent="${continent}"]`);
		const scoreControls = filterSelect?.closest('.score-controls');

		if (scores && scores.length > 0) {
			// Show scores, hide "no scores" message
			scoreList.style.display = 'block';
			noScores.style.display = 'none';
			if (scoreControls) scoreControls.style.display = '';

			// Build the player filter dropdown
			populateFilterSelect(filterSelect, scores);

			// Apply the current filter
			const filterValue = filterSelect ? filterSelect.value : '';
			const filtered = filterValue ? scores.filter(s => s.name === filterValue) : scores;

			// Top 100
			const top100 = filtered.slice(0, 100);

			// Render
			scoreList.innerHTML = top100.map((score, i) => createScoreItem(score, i)).join('');
		} else {
			// No scores → show message
			scoreList.style.display = 'none';
			noScores.style.display = 'block';
			if (scoreControls) scoreControls.style.display = 'none';
			noScores.innerHTML = '<p>No local scores yet. Play a game to set a record!</p><a href="index.html" class="btn-play-game">Play Game</a>';
		}
	} catch (error) {
		console.error(`Error loading scores for ${continent}:`, error);
	}
}

/**
 * Fill the player-filter <select> with unique player names from the scores list,
 * sorted alphabetically. Preserves the currently selected value if it still exists.
 *
 * @param {HTMLSelectElement|null} select - The filter dropdown
 * @param {Array} scores - All scores for this continent
 */
function populateFilterSelect(select, scores) {
	if (!select) return;

	const currentValue = select.value;
	select.innerHTML = '<option value="">All Players</option>';

	const names = [...new Set(scores.map(s => s.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
	names.forEach(name => {
		const opt = document.createElement('option');
		opt.value = name;
		opt.textContent = name;
		select.appendChild(opt);
	});

	if (currentValue && names.includes(currentValue)) {
		select.value = currentValue;
	}
}

/**
 * Create a single score list item (an <li> element as an HTML string).
 *
 * @param {Object} score - { name, moves, time, difficulty, region, playerCountry, ... }
 * @param {number} index - Position in the sorted list (0 = 1st place)
 * @returns {string} HTML string for the <li>
 */
function createScoreItem(score, index) {
	const rank = index + 1;

	// Podium emoji for top 3
	let rankDisplay;
	if (rank === 1) rankDisplay = '🥇';
	else if (rank === 2) rankDisplay = '🥈';
	else if (rank === 3) rankDisplay = '🥉';
	else rankDisplay = `${rank}.`;

	// Format region string: "africa - West Africa" → "West Africa"
	const regionText = formatRegion(score.region);

	// Get player's country flag (sync lookup, works because we preloaded)
	const flagHtml = score.playerCountry ? getCountryFlagSync(score.playerCountry) : '';

	return `
		<li>
			<span class="score-rank">${rankDisplay}</span>
			<span class="player-name">
				${score.name}, from ${score.playerCountry || ''} ${flagHtml ? `<span class="player-country-flag">${flagHtml}</span>` : ''}
			</span>
			<span class="game-level">
				Level: ${score.difficulty} - ${regionText}
			</span>
			<span class="score-details">
				Time: ${score.time}, in ${score.moves} moves
			</span>
		</li>
	`;
}

/**
 * Convert a region string like "africa - West Africa" to a readable format.
 * If showContinent is false, only shows the region part.
 *
 * @param {string} regionString - e.g. "africa - West Africa"
 * @returns {string} Formatted region name
 */
function formatRegion(regionString) {
	if (typeof regionString !== 'string' || !regionString) {
		return 'Unknown Region';
	}

	const parts = regionString.split(' - ').map(part =>
		part.charAt(0).toUpperCase() + part.slice(1)
	);

	// When the region is "All" (meaning the entire continent was played),
	// return a continent-level label instead of just "All"
	if (parts.length > 1 && parts[parts.length - 1] === 'All') {
		const continentLabels = {
			africa: 'African Continent',
			america: 'American Continent',
			asia: 'Asian Continent',
			europe: 'European Continent'
		};
		return continentLabels[parts[0].toLowerCase()] || parts[0];
	}

	// Return just the region (e.g. "West Africa"), not the continent
	return parts.length > 1 ? parts.slice(1).join(' - ') : parts[0];
}
