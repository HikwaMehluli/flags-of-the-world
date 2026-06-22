/**
 * ScoreManager - Centralized score management with validation and caching
 *
 * Handles score validation, storage, retrieval, and personal best detection
 * Works offline-first with IndexedDB
 *
 * @class ScoreManager
 */
import { timeToSeconds } from '../utils/time-utils.js';
import offlineDB from '../db/offline-db.js';

class ScoreManager {
	constructor() {
		// Validation rules
		this.validDifficulties = ['easy', 'medium', 'hard'];
		this.validContinents = ['africa', 'europe', 'asia', 'america'];
		this.maxMoves = 1000;
		this.maxTimeSeconds = 3600; // 1 hour
		this.minNameLength = 2;
		this.maxNameLength = 50;
	}

	/**
	 * Validate score data
	 *
	 * @param {Object} score - Score object to validate
	 * @param {string} score.name - Player name
	 * @param {number} score.moves - Number of moves
	 * @param {string} score.time - Time in "MM:SS" format
	 * @param {string} score.difficulty - Difficulty level
	 * @param {string} score.continent - Continent
	 * @param {string} [score.region] - Region (optional)
	 * @param {string} [score.playerCountry] - Player's country (optional)
	 * @returns {Object} Validation result with isValid and errors array
	 *
	 * @example
	 * const result = scoreManager.validateScore({
	 *   name: 'John',
	 *   moves: 12,
	 *   time: '02:30',
	 *   difficulty: 'medium',
	 *   continent: 'africa'
	 * });
	 * // Returns: { isValid: true, errors: [] }
	 */
	validateScore(score) {
		const errors = [];

		// Sanitize name to prevent XSS
		if (score.name && typeof score.name === 'string') {
			// Remove potentially dangerous characters
			score.name = score.name
				.replace(/[<>]/g, '') // Remove angle brackets
				.replace(/&/g, '&amp;') // Escape ampersands
				.replace(/"/g, '&quot;') // Escape double quotes
				.replace(/'/g, '&#x27;') // Escape single quotes
				.trim();
		}

		// Validate name
		if (!score.name || typeof score.name !== 'string') {
			errors.push('Name is required');
		} else if (score.name.length < this.minNameLength) {
			errors.push(`Name must be at least ${this.minNameLength} characters`);
		} else if (score.name.length > this.maxNameLength) {
			errors.push(`Name must be at most ${this.maxNameLength} characters`);
		} else if (!/^[\w\s'-]+$/.test(score.name)) {
			errors.push('Name can only contain letters, numbers, spaces, and -\'');
		}

		// Validate moves
		if (typeof score.moves !== 'number' || score.moves <= 0) {
			errors.push('Moves must be a positive number');
		} else if (score.moves >= this.maxMoves) {
			errors.push(`Moves must be less than ${this.maxMoves}`);
		} else if (!Number.isInteger(score.moves)) {
			errors.push('Moves must be a whole number');
		}

		// Validate time
		if (!score.time || typeof score.time !== 'string') {
			errors.push('Time is required');
		} else {
			const timeSeconds = timeToSeconds(score.time);
			if (timeSeconds <= 0) {
				errors.push('Time must be greater than 0 seconds');
			} else if (timeSeconds >= this.maxTimeSeconds) {
				errors.push(`Time must be less than ${this.maxTimeSeconds / 60} minutes`);
			}
		}

		// Validate difficulty
		if (!this.validDifficulties.includes(score.difficulty)) {
			errors.push(`Difficulty must be one of: ${this.validDifficulties.join(', ')}`);
		}

		// Validate continent
		if (!this.validContinents.includes(score.continent)) {
			errors.push(`Continent must be one of: ${this.validContinents.join(', ')}`);
		}

		// Validate region (optional)
		if (score.region && typeof score.region !== 'string') {
			errors.push('Region must be a string');
		}

		// Validate playerCountry (optional)
		if (score.playerCountry && typeof score.playerCountry !== 'string') {
			errors.push('Player country must be a string');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Save score to IndexedDB
	 *
	 * @param {Object} score - Score object (already validated)
	 * @returns {Promise<Object>} Saved score with metadata
	 * @throws {Error} If validation fails or storage fails
	 */
	async saveScore(score) {
		// Validate score first
		const validation = this.validateScore(score);
		if (!validation.isValid) {
			const error = new Error('Score validation failed');
			error.validationErrors = validation.errors;
			throw error;
		}

		try {
			// Add metadata
			const scoreWithMetadata = {
				...score,
				createdAt: new Date().toISOString()
			};

			// Save to IndexedDB
			const scoreId = await offlineDB.addScore(scoreWithMetadata);
			scoreWithMetadata.id = scoreId;

			console.log('Score saved:', scoreWithMetadata);
			return scoreWithMetadata;
		} catch (error) {
			console.error('Error saving score:', error);
			throw new Error('Failed to save score');
		}
	}

	/**
	 * Get scores for specific continent and difficulty
	 *
	 * @param {string} continent - Continent name
	 * @param {string} [difficulty] - Difficulty level (optional, returns all if not specified)
	 * @returns {Array} Array of scores sorted by moves then time
	 */
	async getScores(continent, difficulty = null) {
		try {
			return await offlineDB.getScoresByContinent(continent, difficulty);
		} catch (error) {
			console.error('Error getting scores:', error);
			return [];
		}
	}

	/**
	 * Get user's personal best score for specific continent and difficulty
	 *
	 * @param {string} continent - Continent name
	 * @param {string} difficulty - Difficulty level
	 * @param {string} [playerName] - Player name to filter by (optional)
	 * @returns {Promise<Object|null>} Personal best score or null
	 */
	async getPersonalBest(continent, difficulty, playerName = null) {
		const scores = await this.getScores(continent, difficulty);

		if (!scores || scores.length === 0) {
			return null;
		}

		// Filter by player name if provided
		let playerScores = scores;
		if (playerName) {
			playerScores = scores.filter(s => s.name && s.name.toLowerCase() === playerName.toLowerCase());
		}

		// Return best score (first in sorted list)
		return playerScores[0] || null;
	}

	/**
	 * Check if a score is a personal best
	 *
	 * @param {Object} newScore - New score to check
	 * @param {string} [playerName] - Player name to check against
	 * @returns {Promise<boolean>} True if personal best
	 */
	async isPersonalBest(newScore, playerName = null) {
		const currentBest = await this.getPersonalBest(newScore.continent, newScore.difficulty, playerName);

		if (!currentBest) {
			return true; // No previous score, so this is a best
		}

		// Compare moves first, then time
		if (newScore.moves < currentBest.moves) {
			return true;
		} else if (newScore.moves === currentBest.moves) {
			return timeToSeconds(newScore.time) < timeToSeconds(currentBest.time);
		}

		return false;
	}

	/**
	 * Get all scores across all continents
	 *
	 * @returns {Promise<Array>} All scores
	 */
	async getAllScores() {
		const allScores = [];
		const continents = ['africa', 'europe', 'asia', 'america'];

		for (const continent of continents) {
			const scores = await this.getScores(continent);
			if (scores && Array.isArray(scores)) {
				allScores.push(...scores);
			}
		}

		return allScores;
	}

	/**
	 * Clear scores for specific continent
	 *
	 * @param {string} continent - Continent name
	 * @returns {boolean} True if cleared successfully
	 */
	async clearScores(continent) {
		try {
			const scores = await offlineDB.getScoresByContinent(continent);

			for (const score of scores) {
				await offlineDB.delete('scores', score.id);
			}

			return true;
		} catch (error) {
			console.error('Error clearing scores:', error);
			return false;
		}
	}

	/**
	 * Clear all scores
	 *
	 * @returns {boolean} True if cleared successfully
	 */
	async clearAllScores() {
		const continents = ['africa', 'europe', 'asia', 'america'];
		let success = true;

		for (const continent of continents) {
			const result = await this.clearScores(continent);
			if (!result) {
				success = false;
			}
		}

		return success;
	}

	/**
	 * Get score statistics
	 *
	 * @returns {Promise<Object>} Statistics object
	 */
	async getStats() {
		const allScores = await this.getAllScores();
		const continents = ['africa', 'europe', 'asia', 'america'];

		const stats = {
			totalScores: allScores.length,
			byContinent: {},
			byDifficulty: {
				easy: 0,
				medium: 0,
				hard: 0
			},
			bestScores: {}
		};

		// Count by continent
		for (const continent of continents) {
			const scores = await this.getScores(continent);
			stats.byContinent[continent] = scores ? scores.length : 0;

			// Get best score for each continent
			if (scores && scores.length > 0) {
				stats.bestScores[continent] = scores[0];
			}
		}

		// Count by difficulty
		allScores.forEach(score => {
			if (stats.byDifficulty.hasOwnProperty(score.difficulty)) {
				stats.byDifficulty[score.difficulty]++;
			}
		});

		return stats;
	}
}

// Export singleton instance
const scoreManager = new ScoreManager();
export default scoreManager;

// Also export class for testing
export { ScoreManager };
