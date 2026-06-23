/**
 * scores.js — Everything related to player scores
 *
 * This file handles:
 *   1. IndexedDB storage (saving, loading, clearing scores)
 *   2. Score validation (name, moves, time, difficulty, continent)
 *   3. Personal best detection
 *   4. Time formatting helpers
 *   5. Confirm modal (used when clearing scores)
 *
 * Why is this all in one file?
 *   - IndexedDB is only used for scores, so a generic DB wrapper is overkill.
 *   - Validation, storage, and personal-best logic all work together closely.
 *   - Keeping them together means a learner only needs to open ONE file
 *     to understand the entire scoring system.
 *
 * @module scores
 */

// ============================================================
//  1. INDEXED DB — Store & retrieve scores
// ============================================================

const DB_NAME = 'FlagsOfTheWorldDB';
const DB_VERSION = 1;
const STORE_NAME = 'scores';

/**
 * Open (or create) the IndexedDB database.
 * Returns a promise that resolves to the database instance.
 *
 * IndexedDB is a built-in browser database that works offline.
 * Unlike localStorage, it can store structured data (objects, arrays)
 * and is much faster for querying.
 *
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			console.error('IndexedDB error:', request.error);
			reject(request.error);
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		// Runs when the DB is created or upgraded to a new version.
		// We create the 'scores' object store (like a table) with:
		//   - autoIncrement: true  → each score gets a unique ID
		//   - keyPath: 'id'        → the ID is stored on the object itself
		//   - indexes on continent, difficulty, name → for fast lookups
		request.onupgradeneeded = (event) => {
			const db = event.target.result;

			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
				store.createIndex('continent', 'continent', { unique: false });
				store.createIndex('difficulty', 'difficulty', { unique: false });
				store.createIndex('name', 'name', { unique: false });
			}
		};
	});
}

/**
 * Add a score to the database.
 *
 * @param {Object} score - The score object to save
 * @returns {Promise<number>} The auto-generated ID of the saved score
 */
async function addScore(score) {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.add(score);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
}

/**
 * Get all scores for a given continent, optionally filtered by difficulty.
 * Results are sorted: fewest moves first, then fastest time.
 *
 * @param {string} continent - 'africa', 'europe', 'asia', or 'america'
 * @param {string|null} [difficulty=null] - 'easy', 'medium', 'hard', or null for all
 * @returns {Promise<Array>} Array of score objects
 */
async function getScores(continent, difficulty = null) {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const index = store.index('continent');
		const request = index.getAll(continent);

		request.onerror = () => reject(request.error);

		request.onsuccess = () => {
			let scores = request.result || [];

			// Filter by difficulty if specified
			if (difficulty) {
				scores = scores.filter(s => s.difficulty === difficulty);
			}

			// Sort: fewer moves first, then faster time
			scores.sort((a, b) => {
				if (a.moves !== b.moves) return a.moves - b.moves;
				return a.time.localeCompare(b.time);
			});

			resolve(scores);
		};
	});
}

/**
 * Delete a score by its ID.
 *
 * @param {number} id - The score's auto-generated ID
 * @returns {Promise<void>}
 */
async function deleteScore(id) {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.delete(id);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

/**
 * Clear ALL scores for a given continent.
 * Used by the "Clear Scores" button on the scores page.
 *
 * @param {string} continent - Continent to clear scores for
 * @returns {Promise<boolean>} True if successful
 */
async function clearScores(continent) {
	try {
		const scores = await getScores(continent);
		for (const score of scores) {
			await deleteScore(score.id);
		}
		return true;
	} catch (error) {
		console.error('Error clearing scores:', error);
		return false;
	}
}

// ============================================================
//  2. TIME HELPERS  (converted from the old time-utils.js)
// ============================================================

/**
 * Convert "MM:SS" string to total seconds.
 * @param {string} timeStr - Time like "02:30"
 * @returns {number} Total seconds (150 for "02:30")
 */
function timeToSeconds(timeStr) {
	const [minutes, seconds] = timeStr.split(':').map(Number);
	return minutes * 60 + seconds;
}

/**
 * Convert total seconds to "MM:SS" string.
 * @param {number} seconds - Total seconds (150)
 * @returns {string} Time like "02:30"
 */
function secondsToTime(seconds) {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ============================================================
//  3. CONFIRM MODAL  (replaces the old confirm-modal.js)
// ============================================================

/**
 * Show a modal that asks the user to confirm an action.
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 *
 * This is a replacement for the browser's native confirm() dialog,
 * which looks ugly and can't be styled. Instead we create a custom
 * modal overlay with our own CSS classes.
 *
 * @param {string} message - The question to ask (e.g. "Clear all scores?")
 * @returns {Promise<boolean>} true if user clicked "Yes", false otherwise
 */
function showConfirmModal(message) {
	return new Promise(resolve => {
		// Create the overlay element
		const overlay = document.createElement('div');
		overlay.className = 'modal-overlay';
		overlay.style.display = 'block';

		overlay.innerHTML = `
			<div class="modal-content confirm-modal-content">
				<p>${message}</p>
				<div class="confirm-modal-actions">
					<button class="btn-cancel">Cancel</button>
					<button class="btn-confirm">Yes, clear</button>
				</div>
			</div>
		`;

		document.body.appendChild(overlay);

		// Cancel button → resolve false
		overlay.querySelector('.btn-cancel').onclick = () => {
			overlay.remove();
			resolve(false);
		};

		// Confirm button → resolve true
		overlay.querySelector('.btn-confirm').onclick = () => {
			overlay.remove();
			resolve(true);
		};

		// Clicking outside the modal (on the overlay) also cancels
		overlay.onclick = e => {
			if (e.target === overlay) {
				overlay.remove();
				resolve(false);
			}
		};
	});
}

// ============================================================
//  4. SCORE VALIDATION & PERSISTENCE
// ============================================================

/** Valid difficulty values */
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

/** Valid continent values */
const VALID_CONTINENTS = ['africa', 'europe', 'asia', 'america'];

/** Maximum allowed moves */
const MAX_MOVES = 999;

/** Maximum allowed time in seconds (60 minutes) */
const MAX_TIME_SECONDS = 3600;

/** Minimum player name length */
const MIN_NAME_LENGTH = 2;

/** Maximum player name length */
const MAX_NAME_LENGTH = 50;

/**
 * Validate a score object and return any errors.
 *
 * This checks:
 *   - Player name is 2–50 characters and doesn't contain HTML (<, >, &)
 *   - Moves is a positive whole number less than 1000
 *   - Time is a valid "MM:SS" string less than 60 minutes
 *   - Difficulty is one of: easy, medium, hard
 *   - Continent is one of africa, europe, asia, america
 *
 * @param {Object} score - The score to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
function validateScore(score) {
	const errors = [];

	// --- Name validation ---
	if (!score.name || typeof score.name !== 'string') {
		errors.push('Name is required');
	} else {
		// Trim whitespace and strip dangerous HTML characters (XSS prevention)
		score.name = score.name
			.replace(/[<>]/g, '')
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#x27;')
			.trim();

		if (score.name.length < MIN_NAME_LENGTH) {
			errors.push(`Name must be at least ${MIN_NAME_LENGTH} characters`);
		} else if (score.name.length > MAX_NAME_LENGTH) {
			errors.push(`Name must be at most ${MAX_NAME_LENGTH} characters`);
		} else if (!/^[\w\s'-]+$/.test(score.name)) {
			errors.push('Name can only contain letters, numbers, spaces, hyphens, and apostrophes');
		}
	}

	// --- Moves validation ---
	if (typeof score.moves !== 'number' || score.moves <= 0 || !Number.isInteger(score.moves)) {
		errors.push('Moves must be a positive whole number');
	} else if (score.moves > MAX_MOVES) {
		errors.push(`Moves must be ${MAX_MOVES} or less`);
	}

	// --- Time validation ---
	if (!score.time || typeof score.time !== 'string') {
		errors.push('Time is required');
	} else {
		const totalSeconds = timeToSeconds(score.time);
		if (totalSeconds <= 0) {
			errors.push('Time must be greater than 0');
		} else if (totalSeconds > MAX_TIME_SECONDS) {
			errors.push('Time must be under 60 minutes');
		}
	}

	// --- Difficulty validation ---
	if (!VALID_DIFFICULTIES.includes(score.difficulty)) {
		errors.push(`Difficulty must be: ${VALID_DIFFICULTIES.join(', ')}`);
	}

	// --- Continent validation ---
	if (!VALID_CONTINENTS.includes(score.continent)) {
		errors.push(`Continent must be: ${VALID_CONTINENTS.join(', ')}`);
	}

	// --- Region (optional) ---
	if (score.region && typeof score.region !== 'string') {
		errors.push('Region must be text');
	}

	// --- Player country (optional) ---
	if (score.playerCountry && typeof score.playerCountry !== 'string') {
		errors.push('Player country must be text');
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Save a validated score to IndexedDB.
 *
 * Steps:
 *   1. Validate all fields
 *   2. Add createdAt timestamp
 *   3. Write to IndexedDB
 *   4. Return the saved score with its new ID
 *
 * @param {Object} score - { name, moves, time, difficulty, continent, region, playerCountry }
 * @returns {Promise<Object>} The saved score with id and createdAt
 * @throws {Error} If validation fails (error.validationErrors has details)
 */
async function saveScore(score) {
	// Step 1: Validate
	const validation = validateScore(score);
	if (!validation.isValid) {
		const error = new Error('Score validation failed');
		error.validationErrors = validation.errors;
		throw error;
	}

	// Step 2: Add timestamp
	const scoreWithMeta = {
		...score,
		createdAt: new Date().toISOString()
	};

	// Step 3: Save to IndexedDB
	const id = await addScore(scoreWithMeta);
	scoreWithMeta.id = id;

	return scoreWithMeta;
}

/**
 * Get the personal best score for a player on a specific continent+difficulty.
 *
 * "Personal best" means the score with the fewest moves (and fastest time
 * if moves are tied) across all games by this player on this continent+difficulty.
 *
 * @param {string} continent - Continent name
 * @param {string} difficulty - Difficulty level
 * @param {string|null} [playerName=null] - Player name to filter by (null = any player)
 * @returns {Promise<Object|null>} Best score or null if none found
 */
async function getPersonalBest(continent, difficulty, playerName = null) {
	const scores = await getScores(continent, difficulty);
	if (!scores || scores.length === 0) return null;

	// Filter by player name if specified
	const filtered = playerName
		? scores.filter(s => s.name && s.name.toLowerCase() === playerName.toLowerCase())
		: scores;

	return filtered[0] || null; // Already sorted: best is first
}

/**
 * Check whether a new score is a personal best for that player.
 *
 * @param {Object} newScore - The score just achieved
 * @param {string|null} playerName - Player name to compare against
 * @returns {Promise<boolean>} True if this is a new personal best
 */
async function isPersonalBest(newScore, playerName = null) {
	const currentBest = await getPersonalBest(newScore.continent, newScore.difficulty, playerName);

	// No previous score → definitely a personal best
	if (!currentBest) return true;

	// Compare: fewer moves is better; if equal, faster time is better
	if (newScore.moves < currentBest.moves) return true;
	if (newScore.moves === currentBest.moves) {
		return timeToSeconds(newScore.time) < timeToSeconds(currentBest.time);
	}

	return false;
}

// ============================================================
//  EXPORTS
// ============================================================

export {
	saveScore,
	getScores,
	clearScores,
	isPersonalBest,
	showConfirmModal,
	secondsToTime,
	timeToSeconds
};
