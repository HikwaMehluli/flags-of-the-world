/**
 * OfflineDB - IndexedDB wrapper for structured offline storage
 *
 * Provides async storage with versioning, transactions, and migrations
 * Stores scores locally with IndexedDB
 *
 * @class OfflineDB
 */
class OfflineDB {
	constructor() {
		this.dbName = 'FlagsOfTheWorldDB';
		this.dbVersion = 1;
		this.db = null;
	}

	/**
	 * Open database connection
	 *
	 * @returns {Promise<IDBDatabase>} Database instance
	 */
	async open() {
		if (this.db) {
			return this.db;
		}

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.dbVersion);

			request.onerror = () => {
				console.error('Error opening IndexedDB:', request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				this.db = request.result;
				console.log('IndexedDB opened successfully');
				resolve(this.db);
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;

				// Create scores store
				if (!db.objectStoreNames.contains('scores')) {
					const scoresStore = db.createObjectStore('scores', { keyPath: 'id', autoIncrement: true });
					scoresStore.createIndex('continent', 'continent', { unique: false });
					scoresStore.createIndex('difficulty', 'difficulty', { unique: false });
					scoresStore.createIndex('name', 'name', { unique: false });
					scoresStore.createIndex('createdAt', 'createdAt', { unique: false });
					console.log('Created scores store');
				}


			};
		});
	}

	/**
	 * Get value from store
	 *
	 * @param {string} storeName - Name of object store
	 * @param {string|number} key - Key to retrieve
	 * @returns {Promise<any>} Value or undefined
	 */
	async get(storeName, key) {
		try {
			const db = await this.open();

			return new Promise((resolve, reject) => {
				const transaction = db.transaction(storeName, 'readonly');
				const store = transaction.objectStore(storeName);
				const request = store.get(key);

				request.onerror = () => {
					console.error(`Error getting ${key} from ${storeName}:`, request.error);
					reject(request.error);
				};

				request.onsuccess = () => {
					resolve(request.result);
				};
			});
		} catch (error) {
			console.error('Error in get():', error);
			throw error;
		}
	}

	/**
	 * Set value in store
	 *
	 * @param {string} storeName - Name of object store
	 * @param {string|number} key - Key (ignored for auto-increment stores)
	 * @param {any} value - Value to store
	 * @returns {Promise<string|number>} Key of stored value
	 */
	async set(storeName, key, value) {
		try {
			const db = await this.open();

			return new Promise((resolve, reject) => {
				const transaction = db.transaction(storeName, 'readwrite');
				const store = transaction.objectStore(storeName);

				const request = key !== null && key !== undefined
					? store.put(value, key)
					: store.put(value);

				request.onerror = () => {
					console.error(`Error setting ${key} in ${storeName}:`, request.error);
					reject(request.error);
				};

				request.onsuccess = () => {
					console.log(`Successfully stored in ${storeName}:`, key || request.result);
					resolve(request.result);
				};
			});
		} catch (error) {
			console.error('Error in set():', error);
			throw error;
		}
	}

	/**
	 * Get all values from store
	 *
	 * @param {string} storeName - Name of object store
	 * @param {Object} [options] - Query options
	 * @param {string} [options.index] - Index to query
	 * @param {any} [options.value] - Value to filter by
	 * @returns {Promise<Array>} Array of values
	 */
	async getAll(storeName, options = {}) {
		try {
			const db = await this.open();

			return new Promise((resolve, reject) => {
				const transaction = db.transaction(storeName, 'readonly');
				const store = transaction.objectStore(storeName);

				let request;

				if (options.index && options.value !== undefined) {
					if (!store.indexNames.contains(options.index)) {
						console.warn(`Index '${options.index}' not found in store '${storeName}', falling back to getAll()`);
						request = store.getAll();
					} else {
						try {
							const index = store.index(options.index);
							request = index.getAll(options.value);
						} catch (indexError) {
							console.warn(`Error accessing index '${options.index}':`, indexError);
							request = store.getAll();
						}
					}
				} else {
					request = store.getAll();
				}

				request.onerror = () => {
					console.error(`Error getting all from ${storeName}:`, request.error);
					reject(request.error);
				};

				request.onsuccess = () => {
					resolve(request.result);
				};
			});
		} catch (error) {
			console.error('Error in getAll():', error);
			throw error;
		}
	}

	/**
	 * Delete value from store
	 *
	 * @param {string} storeName - Name of object store
	 * @param {string|number} key - Key to delete
	 * @returns {Promise<void>}
	 */
	async delete(storeName, key) {
		try {
			const db = await this.open();

			return new Promise((resolve, reject) => {
				const transaction = db.transaction(storeName, 'readwrite');
				const store = transaction.objectStore(storeName);
				const request = store.delete(key);

				request.onerror = () => {
					console.error(`Error deleting ${key} from ${storeName}:`, request.error);
					reject(request.error);
				};

				request.onsuccess = () => {
					console.log(`Successfully deleted ${key} from ${storeName}`);
					resolve();
				};
			});
		} catch (error) {
			console.error('Error in delete():', error);
			throw error;
		}
	}

	/**
	 * Clear all values from store
	 *
	 * @param {string} storeName - Name of object store
	 * @returns {Promise<void>}
	 */
	async clear(storeName) {
		try {
			const db = await this.open();

			return new Promise((resolve, reject) => {
				const transaction = db.transaction(storeName, 'readwrite');
				const store = transaction.objectStore(storeName);
				const request = store.clear();

				request.onerror = () => {
					console.error(`Error clearing ${storeName}:`, request.error);
					reject(request.error);
				};

				request.onsuccess = () => {
					console.log(`Successfully cleared ${storeName}`);
					resolve();
				};
			});
		} catch (error) {
			console.error('Error in clear():', error);
			throw error;
		}
	}

	/**
	 * Add score to scores store
	 *
	 * @param {Object} score - Score object
	 * @returns {Promise<number>} Score ID
	 */
	async addScore(score) {
		return await this.set('scores', null, score);
	}

	/**
	 * Get scores by continent and difficulty
	 *
	 * @param {string} continent - Continent name
	 * @param {string} [difficulty] - Difficulty level (optional)
	 * @returns {Promise<Array>} Array of scores
	 */
	async getScoresByContinent(continent, difficulty = null) {
		try {
			const db = await this.open();

			return new Promise((resolve, reject) => {
				const transaction = db.transaction('scores', 'readonly');
				const store = transaction.objectStore('scores');
				const index = store.index('continent');
				const request = index.getAll(continent);

				request.onerror = () => {
					reject(request.error);
				};

				request.onsuccess = () => {
					let scores = request.result;

					// Filter by difficulty if specified
					if (difficulty) {
						scores = scores.filter(s => s.difficulty === difficulty);
					}

					// Sort by moves then time
					scores.sort((a, b) => {
						if (a.moves !== b.moves) {
							return a.moves - b.moves;
						}
						return a.time.localeCompare(b.time);
					});

					resolve(scores);
				};
			});
		} catch (error) {
			console.error('Error getting scores by continent:', error);
			return [];
		}
	}

	/**
	 * Export all data for backup
	 *
	 * @returns {Promise<Object>} All data
	 */
	async exportAll() {
		const scores = await this.getAll('scores');
		const metadata = await this.getAll('metadata');

		return {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			data: {
				scores,
				metadata
			}
		};
	}

	/**
	 * Close database connection
	 *
	 * @returns {void}
	 */
	close() {
		if (this.db) {
			this.db.close();
			this.db = null;
			console.log('IndexedDB connection closed');
		}
	}
}

// Export singleton instance
const offlineDB = new OfflineDB();
export default offlineDB;

// Also export class for testing
export { OfflineDB };
