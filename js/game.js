import tippy from 'tippy.js';

// Import utility modules for DRY code
import { timeToSeconds, secondsToTime } from './utils/time-utils.js';
import { populateCountryDropdown } from './utils/country-utils.js';
import scoreManager from './score/score-manager.js';
import gameStateManager from './game/game-state-manager.js';
import GameRenderer from './game/game-renderer.js';
import CardMatcher from './game/card-matcher.js';
import Timer from './game/timer.js';
import { showSuccessToast } from './utils/toast.js';

class FlagsofWorld {
	constructor() {
		// --- UI Elements ---
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

		// --- Submission State ---
		this.isSubmitting = false;

		// --- Game Settings ---
		this.continent = 'africa';
		this.difficulty = 'easy';
		this.region = 'all';

		// --- GameRenderer ---
		this.renderer = new GameRenderer({
			onCardFlip: (index) => this.handleCardFlip(index)
		});

		// --- CardMatcher ---
		this.cardMatcher = new CardMatcher({
			onComboChange: (combo) => this.handleComboChange(combo),
			onMatch: (result) => this.handleMatch(result),
			onMismatch: (result) => this.handleMismatch(result)
		});

		// --- Timer ---
		this.timer = new Timer({
			onTick: (elapsed) => {
				gameStateManager.setState({ time: elapsed });
				this.renderer.updateTime(elapsed);
			},
			onStop: (elapsed) => {
				console.log('Timer stopped at:', elapsed);
			}
		});

		// --- Setup ---
		this.initializeSelectors();
		this.updateRegionSelector().then(() => {
			this.startNewGame();
		});
	}

	initializeSelectors() {
		const continentSelect = document.getElementById('continent-select');
		const difficultySelect = document.getElementById('difficulty-select');
		const regionSelect = document.getElementById('region-select');
		const newGameBtn = document.getElementById('new-game-btn');
		const restartBtn = document.getElementById('restart-btn');

		continentSelect.addEventListener('change', async (e) => {
			this.continent = e.target.value;
			await this.updateRegionSelector();
			this.startNewGame();
		});

		difficultySelect.addEventListener('change', (e) => {
			this.difficulty = e.target.value;
			this.startNewGame();
		});

		regionSelect.addEventListener('change', (e) => {
			this.region = e.target.value;
			this.startNewGame();
		});

		newGameBtn.addEventListener('click', () => this.startNewGame());
		restartBtn.addEventListener('click', () => this.restartGame());

		if (this.nameForm) {
			this.nameForm.addEventListener('submit', async (e) => {
				e.preventDefault();

				if (this.isSubmitting) {
					console.log('Score submission already in progress');
					return;
				}

				const playerName = this.playerNameInput.value.trim();
				const playerCountry = this.playerCountrySelect ? this.playerCountrySelect.value : '';
				if (playerName) {
					this.isSubmitting = true;

					try {
						const state = gameStateManager.getState();
						const moves = state ? state.moves : 0;
						const timeSeconds = state ? state.time : 0;

						const minutes = Math.floor(timeSeconds / 60).toString().padStart(2, '0');
						const secs = (timeSeconds % 60).toString().padStart(2, '0');
						const time = `${minutes}:${secs}`;

						await this.saveScore(playerName, moves, time, this.difficulty, this.region, playerCountry);
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
				}
			});
		}

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

	async updateRegionSelector() {
		const regionSelect = document.getElementById('region-select');
		const regionGroup = regionSelect.parentElement;
		const regionTitle = regionGroup.querySelector('.selector-title');
		const gameTitle = document.querySelector('.game-title');
		regionSelect.innerHTML = '';

		const continentName = this.continent.charAt(0).toUpperCase() + this.continent.slice(1);
		regionTitle.textContent = `Select Region`;
		gameTitle.textContent = `Flags of ${continentName}`;

		const flagFiles = {
			africa: 'api/countries/flags_africa.json',
			europe: 'api/countries/flags_europe.json',
			asia: 'api/countries/flags_asia.json',
			america: 'api/countries/flags_america.json'
		};
		const fileName = flagFiles[this.continent];
		if (!fileName) {
			regionGroup.style.display = 'none';
			return;
		}
		regionGroup.style.display = 'block';

		try {
			const response = await fetch(fileName);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const flagsData = await response.json();

			const allOption = document.createElement('option');
			allOption.value = 'all';
			allOption.textContent = `All of ${continentName}`;
			regionSelect.appendChild(allOption);

			for (const regionKey in flagsData) {
				const option = document.createElement('option');
				option.value = regionKey;
				option.textContent = regionKey;
				regionSelect.appendChild(option);
			}

			this.region = 'all';
			regionSelect.value = 'all';
		} catch (error) {
			if (error instanceof SyntaxError) {
				console.error(`Malformed JSON in flag data: ${fileName}`, error);
				this.showNotification('Invalid flag data format. Please refresh the page.', 'error');
			} else {
				console.error(`Error loading regions for ${this.continent}:`, error);
			}
			regionGroup.style.display = 'none';
		}
	}

	async getFlags() {
		const flagFiles = {
			africa: 'api/countries/flags_africa.json',
			europe: 'api/countries/flags_europe.json',
			asia: 'api/countries/flags_asia.json',
			america: 'api/countries/flags_america.json'
		};
		const fileName = flagFiles[this.continent];
		if (!fileName) return [];

		try {
			const response = await fetch(fileName);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const flags = await response.json();

			if (this.region === 'all') {
				return Object.values(flags).flat();
			}
			return flags[this.region] || [];
		} catch (error) {
			if (error instanceof SyntaxError) {
				console.error(`Malformed JSON in flag data: ${fileName}`, error);
				this.showNotification('Invalid flag data format. Please refresh the page.', 'error');
			} else {
				console.error('Error loading flag data:', error);
			}
			return [];
		}
	}

	getDifficultySettings() {
		const settings = {
			easy: { rows: 3, cols: 4, pairs: 6 },
			medium: { rows: 4, cols: 4, pairs: 8 },
			hard: { rows: 5, cols: 4, pairs: 10 }
		};
		return settings[this.difficulty];
	}

	async generateCards() {
		const { pairs } = this.getDifficultySettings();
		let availableFlags = await this.getFlags();

		if (availableFlags.length < pairs) {
			this.showRegionMixNotification();
			const additionalFlags = await this.getAdditionalFlagsFromContinent(pairs * 2 - availableFlags.length);
			availableFlags = [...availableFlags, ...additionalFlags];
		}

		availableFlags = this.shuffleArray(availableFlags);

		const cardPairs = [];
		const flagsToUse = availableFlags.slice(0, pairs);
		for (let i = 0; i < pairs && i < flagsToUse.length; i++) {
			const flag = flagsToUse[i];
			cardPairs.push(flag, flag);
		}
		const cards = this.shuffleArray(cardPairs);

		if (cards.length < pairs * 2) {
			console.warn(`Insufficient flags for ${this.difficulty} difficulty. Expected ${pairs * 2}, got ${cards.length}`);
			this.showNotification('Not enough flags available for this difficulty. Adjusting game...', 'warning');
		}

		return cards;
	}

	showRegionMixNotification() {
		const existingNotification = document.getElementById('region-mix-notification');
		if (existingNotification) {
			existingNotification.remove();
		}

		const modalOverlay = document.createElement('div');
		modalOverlay.id = 'region-mix-notification';
		modalOverlay.className = 'modal-overlay';
		modalOverlay.style.display = 'block';
		modalOverlay.style.zIndex = '9999';
		modalOverlay.innerHTML = `
            <div class="modal-content">
                <p>Combining flags from multiple regions in this continent to ensure game completion.</p>
                <button id="notification-close-btn">Continue</button>
            </div>
        `;

		document.body.appendChild(modalOverlay);

		const notificationCloseBtn = modalOverlay.querySelector('#notification-close-btn');

		const closeNotification = () => {
			if (document.body.contains(modalOverlay)) {
				document.body.removeChild(modalOverlay);
			}
		};

		if (notificationCloseBtn) {
			notificationCloseBtn.addEventListener('click', closeNotification);
		}

		modalOverlay.addEventListener('click', (event) => {
			if (event.target === modalOverlay) {
				closeNotification();
			}
		});

		setTimeout(() => {
			closeNotification();
		}, 10000);
	}

	async getAdditionalFlagsFromContinent(neededCount) {
		const flagFiles = {
			africa: 'api/countries/flags_africa.json',
			europe: 'api/countries/flags_europe.json',
			asia: 'api/countries/flags_asia.json',
			america: 'api/countries/flags_america.json'
		};
		const fileName = flagFiles[this.continent];

		if (!fileName) return [];

		try {
			const response = await fetch(fileName);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const allFlagsData = await response.json();

			let allOtherFlags = [];
			for (const regionKey in allFlagsData) {
				if (regionKey !== this.region) {
					allOtherFlags = [...allOtherFlags, ...allFlagsData[regionKey]];
				}
			}

			const shuffledFlags = this.shuffleArray(allOtherFlags);
			return shuffledFlags.slice(0, neededCount);
		} catch (error) {
			console.error(`Error loading additional flags for ${this.continent}:`, error);
			return [];
		}
	}

	shuffleArray(array) {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	async createGameBoard() {
		if (!this.gameBoard) {
			console.error('FlagsofWorld: game-board element not found. Cannot create game board.');
			return;
		}

		this.showLoadingIndicator();

		try {
			const cards = await this.generateCards();

			gameStateManager.initialize({
				cards,
				continent: this.continent,
				difficulty: this.difficulty,
				region: this.region
			});

			const { cols } = this.getDifficultySettings();
			this.renderer.render({
				cards,
				cols,
				state: gameStateManager.getState()
			});
		} catch (error) {
			console.error('FlagsofWorld: Error creating game board:', error);
			this.showLoadingIndicator('Failed to load game. Please try again.');
		} finally {
			setTimeout(() => this.hideLoadingIndicator(), 100);
		}
	}

	showLoadingIndicator(message = 'Loading game...') {
		if (!this.gameBoard) return;

		this.gameBoard.innerHTML = `
            <div class="game-loading">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
	}

	hideLoadingIndicator() {
		const loadingEl = this.gameBoard?.querySelector('.game-loading');
		if (loadingEl) {
			loadingEl.remove();
		}
	}

	renderGameBoard() {
		console.log('Rendering handled by GameRenderer');
	}

	initializeTooltips() {
		tippy('[data-tippy-content]', {
			followCursor: true,
		});
	}

	handleCardFlip(index) {
		const state = gameStateManager.getState();
		const cardElement = this.renderer.cardElements.get(index);

		if (!state) {
			console.warn('handleCardFlip: Game state not initialized');
			return;
		}

		if (!cardElement) {
			console.warn('Card element not found for index:', index);
			return;
		}

		if (state.flippedCards.length >= 2 || cardElement.classList.contains('flipped') || cardElement.classList.contains('matched')) {
			return;
		}

		if (!state.gameStarted) {
			this.startTimer();
			gameStateManager.setState({ gameStarted: true });
		}

		this.renderer.flipCard(index);

		const newFlippedCards = [...state.flippedCards, { element: cardElement, country: state.cards[index].country, index }];
		gameStateManager.setState({ flippedCards: newFlippedCards });

		if (newFlippedCards.length === 2) {
			gameStateManager.setState({ moves: state.moves + 1 });
			this.renderer.updateMoves(state.moves + 1);
			setTimeout(() => this.checkMatch(), 1000);
		}
	}

	flipCard(cardElement, index) {
		this.handleCardFlip(index);
	}

	checkMatch() {
		const state = gameStateManager.getState();

		if (!state || !state.flippedCards || state.flippedCards.length < 2) {
			console.warn('checkMatch: Invalid state or not enough flipped cards');
			return;
		}

		const [card1, card2] = state.flippedCards;

		const result = this.cardMatcher.checkMatch(card1, card2);

		if (result.isMatch) {
			this.renderer.matchCards([card1.index, card2.index]);

			gameStateManager.setState({
				matchedPairs: state.matchedPairs + 1,
				matchedIndices: [...state.matchedIndices, card1.index, card2.index],
				flippedCards: []
			});

			if (state.matchedPairs + 1 === this.getDifficultySettings().pairs) {
				this.gameWon();
			}
		} else {
			setTimeout(() => {
				this.renderer.unflipCard(card1.index);
				this.renderer.unflipCard(card2.index);
				gameStateManager.setState({ flippedCards: [] });
			}, 1000);
		}
	}

	handleComboChange(combo) {
		if (combo >= 3) {
			this.renderer.showNotification(`Combo x${combo}!`, 'success');
		}
	}

	handleMatch(result) {
		console.log('Match!', result);
	}

	handleMismatch(result) {
		console.log('Mismatch!', result);
	}

	startTimer() {
		gameStateManager.setState({ gameStarted: true });
		this.timer.start();
	}

	stopTimer() {
		this.timer.stop();
	}

	pauseTimer() {
		this.timer.pause();
	}

	resumeTimer() {
		this.timer.resume();
	}

	async gameWon() {
		this.timer.stop();
		gameStateManager.setState({ gameWon: true });

		const state = gameStateManager.getState();

		this.renderer.showWinModal({
			moves: state.moves,
			time: state.time
		});

		try {
			await this.populateCountryDropdown();
		} catch (error) {
			console.error('Error populating country dropdown:', error);
		}
	}

	async populateCountryDropdown() {
		if (!this.playerCountrySelect) return;

		await populateCountryDropdown(this.playerCountrySelect);
	}

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

		let savedScore;
		try {
			savedScore = await scoreManager.saveScore(score);
		} catch (error) {
			console.error('Error saving score:', error);
			if (error.validationErrors) {
				alert('Invalid score:\n' + error.validationErrors.join('\n'));
			} else {
				alert('Failed to save score. Please try again.');
			}
			throw error;
		}

		const isPB = await scoreManager.isPersonalBest(score, name);
		if (isPB) {
			console.log('New Personal Best!');
			showSuccessToast('🏆 New Personal Best!', 5000);
			this.showConfetti();
		}

		return savedScore;
	}

	showConfetti(duration = 3000) {
		const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bff', '#ff9ff3'];
		const container = document.createElement('div');
		container.className = 'confetti-container';
		Object.assign(container.style, {
			position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
			pointerEvents: 'none', zIndex: '9999', overflow: 'hidden'
		});
		document.body.appendChild(container);

		for (let i = 0; i < 60; i++) {
			const piece = document.createElement('div');
			Object.assign(piece.style, {
				position: 'absolute',
				left: `${Math.random() * 100}%`,
				top: `-${Math.random() * 20}px`,
				width: `${Math.random() * 8 + 4}px`,
				height: `${Math.random() * 8 + 4}px`,
				background: colors[Math.floor(Math.random() * colors.length)],
				borderRadius: Math.random() > 0.5 ? '50%' : '2px',
				animation: `confettiFall ${Math.random() * 2 + 2}s linear forwards`,
				animationDelay: `${Math.random() * 0.5}s`,
				transform: `rotate(${Math.random() * 360}deg)`
			});
			container.appendChild(piece);
		}

		setTimeout(() => container.remove(), duration);
	}

	resetGame() {
		this.timer.stop();

		const currentState = gameStateManager.getState();
		if (currentState) {
			gameStateManager.reset();
		}

		this.cardMatcher.reset();

		this.renderer.updateMoves(0);
		this.renderer.updateTime(0);
		if (this.nameModal) {
			this.nameModal.style.display = 'none';
		}
	}

	startNewGame() {
		this.resetGame();
		this.createGameBoard();
	}

	async restartGame() {
		this.resetGame();

		const state = gameStateManager.getState();
		if (state && state.cards) {
			const reshuffledCards = this.shuffleArray([...state.cards]);
			await this.createGameBoard();
		} else {
			await this.startNewGame();
		}
	}
}

window.addEventListener('DOMContentLoaded', async () => {
	const gameBoard = document.getElementById('game-board');

	if (gameBoard) {
		new FlagsofWorld();
	}
});
