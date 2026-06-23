/**
 * GameStateManager - Centralized game state management
 *
 * Manages game state with validation, persistence, and events
 * Provides immutable state updates and history tracking
 *
 * @class GameStateManager
 */
class GameStateManager {
  constructor() {
    this.state = null;
    this.initialState = null;
    this.listeners = [];
    this.autoSaveEnabled = true;
    this.storageKey = 'gameState';
  }

  /**
   * Initialize game state
   *
   * @param {Object} config - Game configuration
   * @param {string} config.continent - Continent
   * @param {string} config.difficulty - Difficulty
   * @param {string} config.region - Region
   * @param {Array} config.cards - Array of cards
   * @returns {Object} Initial state
   */
  initialize(config) {
    this.initialState = {
      cards: config.cards || [],
      flippedCards: [],
      matchedPairs: 0,
      matchedIndices: [], // Track which specific card indices are matched
      moves: 0,
      time: 0,
      gameStarted: false,
      gameWon: false,
      continent: config.continent || 'africa',
      difficulty: config.difficulty || 'easy',
      region: config.region || 'all',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.state = { ...this.initialState };

    console.log('Game state initialized:', this.state);
    this.notify('initialized', this.state);
    this.save();

    return this.state;
  }

  /**
   * Get current state
   *
   * @returns {Object|null} Current state (immutable copy) or null if not initialized
   */
  getState() {
    if (!this.state) {
      return null;
    }
    return { ...this.state };
  }

  /**
   * Update state with validation
   *
   * @param {Object} partialState - Partial state to update
   * @param {boolean} [saveToHistory=true] - Whether to save to history
   * @returns {Object|null} New state or null if not initialized
   */
  setState(partialState) {
    if (!this.state) {
      console.warn('GameStateManager: setState() called before initialize(). Ignoring update:', partialState);
      return null;
    }

    // Validate state updates
    this.validateStateUpdate(partialState);

    // Create new state object (immutable update)
    const newState = {
      ...this.state,
      ...partialState,
      updatedAt: new Date().toISOString()
    };

    // Validate new state
    this.validateState(newState);

    // Update state
    this.state = newState;

    console.log('State updated:', partialState);
    this.notify('updated', this.state);

    // Auto-save if enabled
    if (this.autoSaveEnabled) {
      this.save();
    }

    return this.state;
  }

  /**
   * Reset state to initial
   *
   * @returns {Object} Reset state
   */
  reset() {
    if (!this.initialState) {
      throw new Error('Initial state not set. Call initialize() first.');
    }

    this.state = { ...this.initialState };

    console.log('Game state reset');
    this.notify('reset', this.state);
    this.save();

    return this.state;
  }

  /**
   * Subscribe to state changes
   *
   * @param {Function} listener - Listener function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify listeners of state change
   *
   * @private
   * @param {string} event - Event name
   * @param {Object} state - Current state
   */
  notify(event, state) {
    this.listeners.forEach(listener => {
      try {
        listener({ event, state });
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  /**
   * Save state to localStorage
   *
   * @returns {boolean} True if saved successfully
   */
  save() {
    try {
      if (!this.state) {
        return false;
      }

      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      console.log('Game state saved');
      return true;
    } catch (error) {
      console.error('Error saving game state:', error);
      return false;
    }
  }

  /**
   * Load state from localStorage
   *
   * @returns {Object|null} Loaded state or null
   */
  load() {
    try {
      const stored = localStorage.getItem(this.storageKey);

      if (!stored) {
        console.log('No saved game state found');
        return null;
      }

      const dataToRestore = JSON.parse(stored);

      if (!dataToRestore.state) {
        console.warn('Invalid saved game state');
        return null;
      }

      this.state = dataToRestore.state;
      this.initialState = { ...dataToRestore.state };

      console.log('Game state loaded');
      this.notify('loaded', this.state);

      return this.state;
    } catch (error) {
      console.error('Error loading game state:', error);
      return null;
    }
  }

  /**
   * Validate state update
   *
   * @private
   * @param {Object} partialState - Partial state to validate
   * @throws {Error} If validation fails
   */
  validateStateUpdate(partialState) {
    const errors = [];

    // Check for circular references
    if (partialState && typeof partialState === 'object') {
      if (this.hasCircularReference(partialState)) {
        errors.push('State contains circular references which cannot be serialized');
      }
    }

    // Validate moves
    if (partialState.moves !== undefined) {
      if (typeof partialState.moves !== 'number' || partialState.moves < 0) {
        errors.push('Moves must be a non-negative number');
      }
    }

    // Validate matchedPairs
    if (partialState.matchedPairs !== undefined) {
      if (typeof partialState.matchedPairs !== 'number' || partialState.matchedPairs < 0) {
        errors.push('Matched pairs must be a non-negative number');
      }
    }

    // Validate time
    if (partialState.time !== undefined) {
      if (typeof partialState.time !== 'number' || partialState.time < 0) {
        errors.push('Time must be a non-negative number');
      }
    }

    // Validate gameStarted
    if (partialState.gameStarted !== undefined) {
      if (typeof partialState.gameStarted !== 'boolean') {
        errors.push('Game started must be a boolean');
      }
    }

    // Validate gameWon
    if (partialState.gameWon !== undefined) {
      if (typeof partialState.gameWon !== 'boolean') {
        errors.push('Game won must be a boolean');
      }
    }

    // Validate flippedCards
    if (partialState.flippedCards !== undefined) {
      if (!Array.isArray(partialState.flippedCards)) {
        errors.push('Flipped cards must be an array');
      } else if (partialState.flippedCards.length > 2) {
        errors.push('Flipped cards cannot exceed 2');
      }
    }

    // Validate cards
    if (partialState.cards !== undefined) {
      if (!Array.isArray(partialState.cards)) {
        errors.push('Cards must be an array');
      }
    }

    if (errors.length > 0) {
      throw new Error(`State validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Check if an object has circular references
   * @private
   * @param {any} obj - Object to check
   * @returns {boolean} True if circular reference found
   */
  hasCircularReference(obj) {
    const seen = new WeakSet();

    const detect = (value) => {
      if (value !== null && typeof value === 'object') {
        if (seen.has(value)) {
          return true;
        }
        seen.add(value);

        if (Array.isArray(value)) {
          return value.some(detect);
        }

        return Object.values(value).some(detect);
      }
      return false;
    };

    return detect(obj);
  }

  /**
   * Validate complete state
   *
   * @private
   * @param {Object} state - State to validate
   * @throws {Error} If validation fails
   */
  validateState(state) {
    const errors = [];

    if (!state.cards || !Array.isArray(state.cards)) {
      errors.push('Cards is required and must be an array');
    }

    if (typeof state.moves !== 'number' || state.moves < 0) {
      errors.push('Moves must be a non-negative number');
    }

    if (typeof state.matchedPairs !== 'number' || state.matchedPairs < 0) {
      errors.push('Matched pairs must be a non-negative number');
    }

    if (typeof state.time !== 'number' || state.time < 0) {
      errors.push('Time must be a non-negative number');
    }

    if (typeof state.gameStarted !== 'boolean') {
      errors.push('Game started must be a boolean');
    }

    if (typeof state.gameWon !== 'boolean') {
      errors.push('Game won must be a boolean');
    }

    if (!state.continent || typeof state.continent !== 'string') {
      errors.push('Continent is required and must be a string');
    }

    if (!state.difficulty || typeof state.difficulty !== 'string') {
      errors.push('Difficulty is required and must be a string');
    }

    if (!state.region || typeof state.region !== 'string') {
      errors.push('Region is required and must be a string');
    }

    if (errors.length > 0) {
      throw new Error(`Invalid state: ${errors.join(', ')}`);
    }
  }

  /**
   * Clear saved state
   *
   * @returns {boolean} True if cleared successfully
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
      this.state = null;
      this.initialState = null;
      console.log('Game state cleared');
      return true;
    } catch (error) {
      console.error('Error clearing game state:', error);
      return false;
    }
  }

  /**
   * Get game statistics
   *
   * @returns {Object} Game statistics
   */
  getStats() {
    if (!this.state) {
      return null;
    }

    return {
      moves: this.state.moves,
      matchedPairs: this.state.matchedPairs,
      totalPairs: this.state.cards.length / 2,
      time: this.state.time,
      gameWon: this.state.gameWon,
      continent: this.state.continent,
      difficulty: this.state.difficulty,
      region: this.state.region
    };
  }
}

// Export singleton instance
const gameStateManager = new GameStateManager();
export default gameStateManager;

// Also export class for testing
export { GameStateManager };
