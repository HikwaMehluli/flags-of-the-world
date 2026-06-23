import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

/**
 * GameRenderer - Pure rendering for game UI
 *
 * Handles all DOM manipulation with no game logic
 * Emits events for user interactions
 *
 * @class GameRenderer
 */
class GameRenderer {
  constructor(options = {}) {
    // Capture DOM elements with validation
    this.gameBoard = options.gameBoard || document.getElementById('game-board');
    this.movesElement = options.movesElement || document.getElementById('moves');
    this.timeElement = options.timeElement || document.getElementById('time');
    this.nameModal = options.nameModal || document.getElementById('name-modal');

    // Validate critical DOM element
    if (!this.gameBoard) {
      throw new Error('GameRenderer: game-board element not found in DOM. Ensure script runs after DOM is loaded.');
    }

    this.eventListeners = new Map();
    this.tooltips = [];
    this.cardElements = new Map();

    this.onCardFlip = options.onCardFlip || (() => {});
    this.onGameWon = options.onGameWon || (() => {});
  }

  /**
   * Render game board from state
   *
   * @param {Object} config - Render configuration
   * @param {Array} config.cards - Array of cards to render
   * @param {number} config.cols - Number of columns
   * @param {Object} config.state - Current game state
   * @returns {void}
   */
  render(config) {
    const { cards, cols, state } = config;

    // Validate gameBoard before rendering
    if (!this.gameBoard) {
      console.error('GameRenderer: gameBoard element not found. Cannot render cards.');
      return;
    }

    // Cleanup previous render
    this.destroy();

    // Set grid layout
    this.gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.gameBoard.innerHTML = '';

    // Render cards
    cards.forEach((card, index) => {
      const cardElement = this.renderCard(card, index);
      if (cardElement) {
        this.cardElements.set(index, cardElement);
      }
    });

    // Update initial UI
    this.updateMoves(state?.moves || 0);
    this.updateTime(state?.time || 0);
  }

  /**
   * Render single card
   *
   * @param {Object} card - Card data
   * @param {string} card.flag - Flag SVG
   * @param {string} card.country - Country name
   * @param {number} index - Card index
   * @returns {HTMLElement|null} Card element or null if failed
   */
  renderCard(card, index) {
    // Validate gameBoard before rendering
    if (!this.gameBoard) {
      console.warn('GameRenderer: gameBoard not available, cannot render card at index', index);
      return null;
    }

    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.dataset.index = index;

    cardElement.innerHTML = `
      <div class="card-back">?</div>
      <div class="card-front" data-tippy-content="${card.country}">
        ${card.flag}
      </div>
    `;

    // Add click listener
    const clickHandler = () => {
      this.onCardFlip(index);
    };

    cardElement.addEventListener('click', clickHandler);
    this.eventListeners.set(cardElement, { type: 'click', handler: clickHandler });

    // Add to DOM
    this.gameBoard.appendChild(cardElement);

    // Initialize tooltip
    this.initTooltip(cardElement);

    return cardElement;
  }

  /**
   * Initialize tooltip for card
   *
   * @private
   * @param {HTMLElement} cardElement - Card element
   */
  initTooltip(cardElement) {
    const tooltipElement = cardElement.querySelector('[data-tippy-content]');

    if (tooltipElement) {
      const tooltip = tippy(tooltipElement, {
        followCursor: true,
        theme: 'light'
      });

      this.tooltips.push(tooltip);
    }
  }

  /**
   * Flip card animation
   *
   * @param {number} index - Card index
   */
  flipCard(index) {
    const cardElement = this.cardElements.get(index);

    if (cardElement) {
      cardElement.classList.add('flipped');
    }
  }

  /**
   * Unflip card animation
   *
   * @param {number} index - Card index
   */
  unflipCard(index) {
    const cardElement = this.cardElements.get(index);

    if (cardElement) {
      cardElement.classList.remove('flipped');
    }
  }

  /**
   * Mark card as matched
   *
   * @param {number} index - Card index
   */
  matchCard(index) {
    const cardElement = this.cardElements.get(index);

    if (cardElement) {
      cardElement.classList.add('matched');
    }
  }

  /**
   * Match cards animation
   *
   * @param {Array<number>} indices - Card indices
   */
  matchCards(indices) {
    indices.forEach(index => this.matchCard(index));
  }

  /**
   * Update moves display
   *
   * @param {number} moves - Number of moves
   */
  updateMoves(moves) {
    if (this.movesElement) {
      this.movesElement.textContent = moves;
    }
  }

  /**
   * Update time display
   *
   * @param {number} seconds - Elapsed time in seconds
   */
  updateTime(seconds) {
    if (this.timeElement) {
      const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      this.timeElement.textContent = `${minutes}:${secs}`;
    }
  }

  /**
   * Show win modal
   *
   * @param {Object} stats - Game statistics
   * @param {number} stats.moves - Number of moves
   * @param {number} stats.time - Time in seconds
   */
  showWinModal(stats) {
    if (!this.nameModal) {
      console.warn('Name modal not found');
      return;
    }

    const movesElement = document.getElementById('modal-final-moves');
    const timeElement = document.getElementById('modal-final-time');

    if (movesElement) {
      movesElement.textContent = stats.moves;
    }

    if (timeElement) {
      const minutes = Math.floor(stats.time / 60).toString().padStart(2, '0');
      const secs = (stats.time % 60).toString().padStart(2, '0');
      timeElement.textContent = `${minutes}:${secs}`;
    }

    this.nameModal.style.display = 'block';
  }

  /**
   * Hide win modal
   */
  hideWinModal() {
    if (this.nameModal) {
      this.nameModal.style.display = 'none';
    }
  }

  /**
   * Show notification
   *
   * @param {string} message - Notification message
   * @param {string} [type='info'] - Notification type (info, success, error, warning)
   */
  showNotification(message, type = 'info') {
    // Check if document.body exists
    if (!document.body) {
      console.warn('GameRenderer: Cannot show notification - document.body not available');
      return;
    }

    // Remove existing notifications
    const existing = document.querySelector('.game-notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `game-notification game-notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  /**
   * Set card flip state from state
   *
   * @param {Array} flippedCards - Flipped cards from state
   */
  setFlippedCards(flippedCards) {
    // Reset all cards
    this.cardElements.forEach((element, index) => {
      const isFlipped = flippedCards.some(fc => fc.index === index);

      if (isFlipped && !element.classList.contains('flipped')) {
        element.classList.add('flipped');
      } else if (!isFlipped && element.classList.contains('flipped')) {
        element.classList.remove('flipped');
      }
    });
  }

  /**
   * Set matched cards from state
   *
   * @param {Array} matchedIndices - Matched card indices
   */
  setMatchedCards(matchedIndices) {
    matchedIndices.forEach(index => {
      const element = this.cardElements.get(index);
      if (element && !element.classList.contains('matched')) {
        element.classList.add('matched');
      }
    });
  }

  /**
   * Sync UI with state
   *
   * @param {Object} state - Game state
   */
  syncWithState(state) {
    this.updateMoves(state.moves);
    this.updateTime(state.time);
    this.setFlippedCards(state.flippedCards);

    // Use matchedIndices from state for accurate card matching
    // This correctly handles shuffled cards instead of assuming position-based matching
    if (state.matchedIndices && state.matchedIndices.length > 0) {
      this.setMatchedCards(state.matchedIndices);
    }

    // Show win modal if game won
    if (state.gameWon) {
      this.showWinModal({
        moves: state.moves,
        time: state.time
      });
    }
  }

  /**
   * Initialize tooltips for all cards
   */
  initializeTooltips() {
    const tooltipElements = this.gameBoard.querySelectorAll('[data-tippy-content]');

    tooltipElements.forEach(element => {
      this.initTooltip(element);
    });
  }

  /**
   * Destroy renderer and cleanup
   *
   * @returns {void}
   */
  destroy() {
    // Remove event listeners
    this.eventListeners.forEach(({ element, handler }, cardElement) => {
      if (cardElement && handler) {
        cardElement.removeEventListener('click', handler);
      }
    });
    this.eventListeners.clear();

    // Destroy tooltips
    this.tooltips.forEach(tooltip => {
      if (tooltip && tooltip.destroy) {
        tooltip.destroy();
      }
    });
    this.tooltips = [];

    // Clear card elements map
    this.cardElements.clear();

    console.log('GameRenderer destroyed');
  }
}

export default GameRenderer;
export { GameRenderer };
