/**
 * game.js — Flags of the World memory card game
 *
 * This is the MAIN class that runs the entire game.
 * It handles everything in one place:
 *   1. Game setup (continent, difficulty, region selectors)
 *   2. Card generation (fetching flag data, shuffling, creating pairs)
 *   3. Board rendering (creating card elements in the DOM)
 *   4. Game logic (flipping cards, matching, timer, moves)
 *   5. Game end (win modal, score saving)
 *
 * Before this rewrite, the game logic was split across 5 separate files:
 *   game-state-manager.js, game-renderer.js, card-matcher.js, timer.js, game.js
 * Now everything is in ONE file so it's easy to follow the flow.
 *
 * How the game works (step by step):
 *   1. Player selects continent → region dropdown updates
 *   2. Player selects difficulty (Easy = 6 pairs, Medium = 8, Hard = 10)
 *   3. Cards are generated: flag SVGs are paired and shuffled
 *   4. Player clicks a card → it flips → timer starts on first flip
 *   5. Player clicks a second card → check for match
 *   6. Match? Cards stay flipped. Mismatch? Cards flip back after 1 second.
 *   7. When all pairs are matched → game won → modal to save score
 *
 * @class FlagsofWorld
 */

import tippy from 'tippy.js';
import { getFlags, getAllFlagData, populateCountryDropdown } from './flags-data.js';
import { saveScore, secondsToTime } from './scores.js';

class FlagsofWorld {
	// ============================================================
	//  1. CONSTRUCTOR — Set up the game when the page loads
	// ============================================================

	constructor() {
		// --- Game settings (changing these starts a new game) ---
		this.continent = 'africa';
		this.difficulty = 'easy';
		this.region = 'all';

		// --- Game state (reset each game) ---
		this.cards = [];           // Array of { country, flag, code } objects
		this.cardElements = [];    // DOM elements, indexed by card position
		this.flippedIndices = [];  // Indices of currently flipped cards (max 2)
		this.matchedIndices = [];  // Set of indices that have been matched
		this.moves = 0;
		this.matchedPairs = 0;
		this.totalPairs = 6;       // Depends on difficulty
		this.gameStarted = false;  // Timer starts on first flip
		this.gameWon = false;

		// --- Timer state ---
		this.elapsedSeconds = 0;
		this.timerInterval = null;

		// --- Submission guard ---
		this.isSubmitting = false;

		// --- Grab DOM elements ---
		this.gameBoard = document.getElementById('game-board');
		this.movesElement = document.getElementById('moves');
		this.timeElement = document.getElementById('time');
		this.nameModal = document.getElementById('name-modal');
		this.nameForm = document.getElementById('name-form');
		this.playerNameInput = document.getElementById('player-name');
		this.playerCountrySelect = document.getElementById('player-country');
		this.modalFinalMoves = document.getElementById('modal-final-moves');
		this.modalFinalTime = document.getElementById('modal-final-time');
		this.closeModalButton = document.querySelector('.close-modal');

		// --- Set up UI ---
		this.initSelectors();
		this.updateRegionSelector().then(() => this.startNewGame());
	}

	// ============================================================
	//  2. SELECTORS — Continent, difficulty, region dropdowns + buttons
	// ============================================================

	/**
	 * Wire up the dropdowns (continent, difficulty, region) and buttons
	 * (New Game, Restart) to their event listeners.
	 * Also handles the name-form submission (score saving).
	 */
	initSelectors() {
		const continentSelect = document.getElementById('continent-select');
		const difficultySelect = document.getElementById('difficulty-select');
		const regionSelect = document.getElementById('region-select');
		const newGameBtn = document.getElementById('new-game-btn');
		const restartBtn = document.getElementById('restart-btn');

		// Changing continent → update region list → start new game
		continentSelect.addEventListener('change', async (e) => {
			this.continent = e.target.value;
			await this.updateRegionSelector();
			this.startNewGame();
		});

		// Changing difficulty → start new game
		difficultySelect.addEventListener('change', (e) => {
			this.difficulty = e.target.value;
			this.startNewGame();
		});

		// Changing region → start new game
		regionSelect.addEventListener('change', (e) => {
			this.region = e.target.value;
			this.startNewGame();
		});

		newGameBtn.addEventListener('click', () => this.startNewGame());
		restartBtn.addEventListener('click', () => this.restartGame());

		// --- Name form submission (after game is won) ---
		if (this.nameForm) {
			this.nameForm.addEventListener('submit', async (e) => {
				e.preventDefault();

				// Prevent double-submit
				if (this.isSubmitting) return;

				const playerName = this.playerNameInput.value.trim();
				const playerCountry = this.playerCountrySelect ? this.playerCountrySelect.value : '';

				if (!playerName) return;

				this.isSubmitting = true;

				try {
					// Format time as MM:SS
					const time = secondsToTime(this.elapsedSeconds);

					// Save score
					await this.saveScore(playerName, this.moves, time, this.difficulty, this.region, playerCountry);

					// Close the modal and reset the form
					this.nameModal.style.display = 'none';
					this.playerNameInput.value = '';
					if (this.playerCountrySelect) {
						this.playerCountrySelect.value = '';
					}
				} catch (error) {
					console.error('Error saving score:', error);
				} finally {
					this.isSubmitting = false;
				}
			});
		}

		// Close modal when clicking X or outside it
		if (this.closeModalButton) {
			this.closeModalButton.addEventListener('click', () => {
				this.nameModal.style.display = 'none';
			});
		}
		if (this.nameModal) {
			this.nameModal.addEventListener('click', (event) => {
				if (event.target === this.nameModal) {
					this.nameModal.style.display = 'none';
				}
			});
		}
	}

	/**
	 * When the continent changes, fetch its flag data and rebuild
	 * the region dropdown (e.g. "West Africa", "East Africa", etc.)
	 * Also sets the default region to "all".
	 */
	async updateRegionSelector() {
		const regionSelect = document.getElementById('region-select');
		const regionGroup = regionSelect.parentElement;
		const regionTitle = regionGroup.querySelector('.selector-title');
		const gameTitle = document.querySelector('.game-title');

		// Update page title: "Flags of Africa", etc.
		const continentName = this.continent.charAt(0).toUpperCase() + this.continent.slice(1);
		regionTitle.textContent = 'Select Region';
		gameTitle.textContent = `Flags of ${continentName}`;

		// Clear old options
		regionSelect.innerHTML = '';

		try {
			// Fetch the raw JSON to get region names
			const fullData = await getAllFlagData();
			const continentData = fullData[this.continent];

			if (!continentData || Object.keys(continentData).length === 0) {
				regionGroup.style.display = 'none';
				return;
			}

			regionGroup.style.display = 'block';

			// Add "All of ..." option at the top
			const allOption = document.createElement('option');
			allOption.value = 'all';
			allOption.textContent = `All of ${continentName}`;
			regionSelect.appendChild(allOption);

			// Add one option per region
			for (const regionName in continentData) {
				const option = document.createElement('option');
				option.value = regionName;
				option.textContent = regionName;
				regionSelect.appendChild(option);
			}

			this.region = 'all';
			regionSelect.value = 'all';
		} catch (error) {
			console.error('Failed to load regions:', error);
			regionGroup.style.display = 'none';
		}
	}

	// ============================================================
	//  3. CARD GENERATION — Fetch flags, shuffle, create pairs
	// ============================================================

	/**
	 * Return the number of card pairs and grid columns for the current difficulty.
	 */
	getDifficultySettings() {
		const settings = {
			easy: { pairs: 6 },
			medium: { pairs: 8 },
			hard: { pairs: 10 }
		};
		return settings[this.difficulty] || settings.easy;
	}

	/**
	 * Fisher-Yates shuffle — randomly re-orders an array.
	 * This is a O(n) algorithm that's both fast and unbiased.
	 */
	shuffle(array) {
		const arr = [...array];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	/**
	 * Fetch flag objects, create pairs (each flag appears twice),
	 * and shuffle them into a random order.
	 *
	 * If the selected region doesn't have enough flags, it fetches
	 * extras from other regions in the same continent.
	 */
	async generateCards() {
		const { pairs } = this.getDifficultySettings();
		this.totalPairs = pairs;

		let availableFlags = await getFlags(this.continent, this.region);

		// Not enough flags in this region? Mix in flags from other regions.
		if (availableFlags.length < pairs) {
			this.showRegionMixNotification();

			const needed = pairs * 2;
			const shortfall = needed - availableFlags.length;
			const extra = await this.getAdditionalFlags(shortfall);
			availableFlags = [...availableFlags, ...extra];
		}

		// Shuffle and take only what we need
		const shuffled = this.shuffle(availableFlags);
		const flagsToUse = shuffled.slice(0, pairs);

		// Create pairs: each flag appears twice (a matching pair)
		const cardPairs = [];
		for (const flag of flagsToUse) {
			cardPairs.push({ ...flag }, { ...flag });
		}

		// Shuffle the pairs into random positions on the board
		return this.shuffle(cardPairs);
	}

	/**
	 * When the current region has too few flags, pull extras from
	 * other regions in the same continent.
	 */
	async getAdditionalFlags(neededCount) {
		const allData = await getAllFlagData();
		const continentData = allData[this.continent];

		if (!continentData) return [];

		const otherFlags = [];

		for (const regionName in continentData) {
			if (regionName !== this.region) {
				const flags = continentData[regionName];
				if (Array.isArray(flags)) {
					otherFlags.push(...flags);
				}
			}
		}

		return this.shuffle(otherFlags).slice(0, neededCount);
	}

	/**
	 * Show a notification modal when the region doesn't have enough flags
	 * and we have to mix in flags from other regions.
	 */
	showRegionMixNotification() {
		// Remove any existing notification first
		const existing = document.getElementById('region-mix-notification');
		if (existing) existing.remove();

		const modal = document.createElement('div');
		modal.id = 'region-mix-notification';
		modal.className = 'modal-overlay';
		modal.style.display = 'block';
		modal.innerHTML = `
			<div class="modal-content">
				<p>Not enough flags for this level, so we have randonly selected other flags from the same continent to ensure game completion.</p>
				<button id="notification-close-btn" class="btn">Continue</button>
			</div>
		`;

		document.body.appendChild(modal);

		const closeBtn = modal.querySelector('#notification-close-btn');
		const close = () => { if (modal.parentNode) modal.remove(); };

		closeBtn.addEventListener('click', close);
		modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

		// Auto-close after 10 seconds
		setTimeout(close, 10000);
	}

	// ============================================================
	//  4. BOARD RENDERING — Create card elements in the grid
	// ============================================================

	/**
	 * Build the entire game board from the generated cards.
	 * This replaces the old GameRenderer.render() method.
	 */
	async createGameBoard() {
		if (!this.gameBoard) return;

		// Show a loading spinner while we fetch data
		this.showLoading();

		try {
			// Generate the shuffled card pairs
			this.cards = await this.generateCards();


			// Create a card element for each position on the board
			// Note: createCardElement() already appends to this.gameBoard
			this.cardElements = [];
			this.cards.forEach((card, index) => {
				const el = this.createCardElement(card, index);
				if (el) {
					this.cardElements.push(el);
				}
			});

			// Reset the display
			this.updateMoveDisplay();
			this.updateTimeDisplay();
		} catch (error) {
			console.error('Failed to create game board:', error);
			this.showLoading('Failed to load game. Please try again.');
		} finally {
			// Brief delay so the loading message is visible
			setTimeout(() => this.hideLoading(), 100);
		}
	}

	/**
	 * Create a single card element in the DOM.
	 *
	 * Each card has:
	 *   - A back face (shows "?" when face-down)
	 *   - A front face (shows the flag SVG when flipped)
	 *   - A tooltip showing the country name
	 *
	 * @param {Object} card - { country, flag, code }
	 * @param {number} index - Position on the board
	 * @returns {HTMLElement}
	 */
	createCardElement(card, index) {
		if (!this.gameBoard) return null;

		const el = document.createElement('div');
		el.className = 'card';
		el.dataset.index = index;

		el.innerHTML = `
			<div class="card-back">
				<svg width="100%" height="100%" viewBox="0 0 2667 2000" version="1.1" xmlns="http://www.w3.org/2000/svg" style="fill:var(--secondary-color);fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><path id="question" d="M1235.574,1413.06c-0.716,-25.783 -1.074,-45.12 -1.074,-58.011c0,-75.916 10.743,-141.447 32.228,-196.593c15.756,-41.539 41.181,-83.436 76.274,-125.69c25.783,-30.796 72.156,-75.737 139.119,-134.822c66.963,-59.085 110.472,-106.174 130.525,-141.267c20.053,-35.093 30.08,-73.409 30.08,-114.948c0,-75.199 -29.364,-141.267 -88.091,-198.204c-58.727,-56.937 -130.704,-85.405 -215.93,-85.405c-82.361,0 -151.115,25.783 -206.261,77.348c-55.146,51.565 -91.314,132.136 -108.502,241.712l-198.741,-23.634c17.905,-146.818 71.081,-259.259 159.53,-337.323c88.449,-78.064 205.366,-117.096 350.752,-117.096c153.98,0 276.806,41.897 368.477,125.69c91.672,83.794 137.508,185.134 137.508,304.021c0,68.754 -16.114,132.136 -48.342,190.147c-32.228,58.011 -95.253,128.555 -189.073,211.633c-63.024,55.862 -104.205,97.043 -123.542,123.542c-19.337,26.499 -33.661,56.937 -42.971,91.314c-9.31,34.377 -14.682,90.239 -16.114,167.587l-185.85,0Zm-11.817,387.814l0,-220.227l220.227,0l0,220.227l-220.227,0Z" style="fill-rule:nonzero;"/></svg>
			</div>
			<div class="card-front" data-tippy-content="${card.country}">
				${card.flag}
			</div>
		`;

		// Click to flip
		el.addEventListener('click', () => this.handleCardClick(index));

		this.gameBoard.appendChild(el);

		// Init tooltip (shows country name on hover)
		const tipEl = el.querySelector('[data-tippy-content]');
		if (tipEl) {
			tippy(tipEl, { followCursor: true });
		}

		return el;
	}

	// ---- Loading indicator ----

	showLoading(message = 'Loading game...') {
		if (!this.gameBoard) return;
		this.gameBoard.innerHTML = `
			<div class="game-loading">
				<div class="loading-spinner"></div>
				<p>${message}</p>
			</div>
		`;
	}

	hideLoading() {
		const el = this.gameBoard?.querySelector('.game-loading');
		if (el) el.remove();
	}

	// ---- Display updates ----

	updateMoveDisplay() {
		if (this.movesElement) {
			this.movesElement.textContent = this.moves;
		}
	}

	updateTimeDisplay() {
		if (this.timeElement) {
			this.timeElement.textContent = secondsToTime(this.elapsedSeconds);
		}
	}

	// ============================================================
	//  5. GAME LOGIC — Card flips, matching, timer
	// ============================================================

	/**
	 * Called when a card is clicked.
	 *
	 * Flow:
	 *   1. Ignore clicks if 2 cards already flipped, or card is already flipped/matched
	 *   2. Start the timer on the very first flip
	 *   3. Flip the card (CSS class)
	 *   4. If this is the second card flipped, check for a match after 1 second delay
	 */
	handleCardClick(index) {
		const el = this.cardElements[index];

		// Guard: can't flip if game won, 2 already flipped, or this card is flipped/matched
		if (this.gameWon) return;
		if (this.flippedIndices.length >= 2) return;
		if (!el) return;
		if (el.classList.contains('flipped') || el.classList.contains('matched')) return;

		// Start timer on first ever flip
		if (!this.gameStarted) {
			this.startTimer();
			this.gameStarted = true;
		}

		// Flip the card
		el.classList.add('flipped');
		this.flippedIndices.push(index);

		// If this is the second card, check for a match after a short delay
		if (this.flippedIndices.length === 2) {
			this.moves++;
			this.updateMoveDisplay();

			setTimeout(() => this.checkMatch(), 1000);
		}
	}

	/**
	 * Compare the two flipped cards.
	 * - If their country names match → they stay flipped
	 * - If not → they flip back after a delay
	 */
	checkMatch() {
		if (this.flippedIndices.length < 2) return;

		const [i1, i2] = this.flippedIndices;
		const card1 = this.cards[i1];
		const card2 = this.cards[i2];
		const el1 = this.cardElements[i1];
		const el2 = this.cardElements[i2];

		if (card1.country === card2.country) {
			// ---- MATCH ----
			this.matchedPairs++;

			// Add matched class (cards stay flipped)
			el1.classList.add('matched');
			el2.classList.add('matched');

			this.matchedIndices.push(i1, i2);

			// Check if ALL pairs are matched → game won!
			if (this.matchedPairs === this.totalPairs) {
				this.gameWon = true;
				this.stopTimer();
				this.showWinModal();
			}
		} else {
			// ---- MISMATCH ----

			// Flip both cards back after a brief delay
			setTimeout(() => {
				el1.classList.remove('flipped');
				el2.classList.remove('flipped');
			}, 800);
		}

		// Reset flipped cards for the next turn
		this.flippedIndices = [];
	}

	// ============================================================
	//  6. TIMER — Start, stop, display
	// ============================================================

	startTimer() {
		if (this.timerInterval) return;

		this.timerInterval = setInterval(() => {
			this.elapsedSeconds++;
			this.updateTimeDisplay();
		}, 1000);
	}

	stopTimer() {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
	}

	// ============================================================
	//  7. GAME END — Win modal, score saving
	// ============================================================

	/**
	 * When the player matches all pairs, stop the timer and show
	 * the name-entry modal with their stats.
	 */
	showWinModal() {
		if (!this.nameModal) return;

		// Update stats in the modal
		if (this.modalFinalMoves) {
			this.modalFinalMoves.textContent = this.moves;
		}
		if (this.modalFinalTime) {
			this.modalFinalTime.textContent = secondsToTime(this.elapsedSeconds);
		}

		// Populate the country dropdown so player can choose their country
		this.populateCountryDropdown();

		// Show the modal
		this.nameModal.style.display = 'block';
	}

	/**
	 * Fill the "Player Country" dropdown with all country names.
	 */
	async populateCountryDropdown() {
		if (!this.playerCountrySelect) return;
		await populateCountryDropdown(this.playerCountrySelect);
	}

	/**
	 * Validate and save the score to IndexedDB.
	 */
	async saveScore(name, moves, time, difficulty, region, playerCountry) {
		const score = {
			name,
			moves,
			time,
			difficulty,
			region: `${this.continent} - ${region}`,
			playerCountry,
			continent: this.continent
		};

		// Save to IndexedDB
		try {
			await saveScore(score);
		} catch (error) {
			console.error('Score save failed:', error);
			if (error.validationErrors) {
				alert('Invalid score:\n' + error.validationErrors.join('\n'));
			} else {
				alert('Failed to save score. Please try again.');
			}
			throw error;
		}

	}

	// ============================================================
	//  8. GAME LIFECYCLE — New game, restart, reset
	// ============================================================

	/**
	 * Reset all state and build a fresh board.
	 */
	resetGame() {
		this.stopTimer();
		this.cards = [];
		this.cardElements = [];
		this.flippedIndices = [];
		this.matchedIndices = [];
		this.moves = 0;
		this.matchedPairs = 0;
		this.gameStarted = false;
		this.gameWon = false;
		this.elapsedSeconds = 0;

		this.updateMoveDisplay();
		this.updateTimeDisplay();

		// Hide modal if open
		if (this.nameModal) {
			this.nameModal.style.display = 'none';
		}
	}

	/**
	 * Start a completely new game (reset + generate new cards).
	 */
	async startNewGame() {
		this.resetGame();
		await this.createGameBoard();
	}

	/**
	 * Restart the current game (reshuffle the same cards).
	 */
	async restartGame() {
		this.resetGame();
		await this.createGameBoard();
	}
}

// ============================================================
//  BOOT — Start the game when the page loads
// ============================================================

window.addEventListener('DOMContentLoaded', async () => {
	if (document.getElementById('game-board')) {
		new FlagsofWorld();
	}
});

export default FlagsofWorld;
