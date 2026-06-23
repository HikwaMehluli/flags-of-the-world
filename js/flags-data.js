/**
 * flags-data.js — Shared flag data fetching & caching
 *
 * This is the SINGLE place where the app fetches flag JSON files
 * from the server. Every other file (game, scores display, etc.)
 * imports from here instead of writing its own fetch logic.
 *
 * How it works:
 *   1. The first call to getAllFlagData() fetches all 4 JSON files
 *      (one per continent) and stores them in an in-memory cache.
 *   2. Subsequent calls return the cached data instantly (no network).
 *   3. Individual helper functions (getFlags, getCountryList, etc.)
 *      let other modules ask for exactly what they need.
 *
 * Data format (from api/countries/flags_{continent}.json):
 *   {
 *     "Region Name": [
 *       { "country": "Nigeria", "code": "ng", "flag": "<span class=\"fi fi-ng\"></span>" },
 *       ...
 *     ],
 *     ...
 *   }
 *
 * @module flags-data
 */

// ---- In-memory cache ----
// Stores ALL flag data so we only fetch from the network once.
let cachedData = null;

/**
 * Fetch ALL flag data from all 4 continents and cache it.
 * This is the only function in the whole app that calls fetch()
 * for the flag JSON files.
 *
 * @returns {Promise<Object>} An object with keys: africa, europe, asia, america.
 *   Each value is the entire continent JSON (regions → array of flag objects).
 *
 * Usage example:
 *   const allData = await getAllFlagData();
 *   const africaFlags = allData.africa; // region → flag objects
 */
export async function getAllFlagData() {
	// Already fetched? Return cached copy.
	if (cachedData) {
		return cachedData;
	}

	const continents = ['africa', 'europe', 'asia', 'america'];
	const result = {};

	// Fetch each continent's JSON file
	for (const continent of continents) {
		try {
			const response = await fetch(`api/countries/flags_${continent}.json`);
			if (response.ok) {
				result[continent] = await response.json();
			} else {
				console.warn(`Could not load flags for ${continent}: HTTP ${response.status}`);
				result[continent] = {};
			}
		} catch (error) {
			console.error(`Network error loading flags for ${continent}:`, error);
			result[continent] = {};
		}
	}

	// Store in cache so we don't fetch again
	cachedData = result;
	return result;
}

/**
 * Clear the cached flag data (forces a fresh fetch on next call).
 * Useful when testing or if data needs to be reloaded.
 */
export function clearCache() {
	cachedData = null;
}

/**
 * Get flag objects for a specific continent and (optionally) region.
 *
 * @param {string} continent - One of: 'africa', 'europe', 'asia', 'america'
 * @param {string} [region='all'] - Region name (e.g. 'West Africa'),
 *   or 'all' to return flags from every region in that continent.
 * @returns {Promise<Array>} Array of flag objects [{ country, code, flag }, ...]
 *
 * Usage examples:
 *   const allEurope = await getFlags('europe');
 *   const westAfrica = await getFlags('africa', 'West Africa');
 */
export async function getFlags(continent, region = 'all') {
	const allData = await getAllFlagData();
	const continentData = allData[continent];

	if (!continentData) {
		return [];
	}

	if (region === 'all') {
		// Merge every region into one big array
		const allFlags = [];
		for (const regionName in continentData) {
			const flags = continentData[regionName];
			if (Array.isArray(flags)) {
				allFlags.push(...flags);
			}
		}
		return allFlags;
	}

	// Return just the requested region's flags
	const flags = continentData[region];
	return Array.isArray(flags) ? flags : [];
}

/**
 * Build a flat list of all country names across all continents.
 *
 * @param {Object} allFlagsData - The full data object from getAllFlagData()
 * @returns {string[]} Alphabetically sorted country names
 *
 * Usage:
 *   const allData = await getAllFlagData();
 *   const names = getCountryList(allData);
 *   // → ["Algeria", "Angola", "Argentina", ...]
 */
export function getCountryList(allFlagsData) {
	const countrySet = new Set();

	for (const continentName in allFlagsData) {
		const continent = allFlagsData[continentName];
		for (const regionName in continent) {
			const flags = continent[regionName];
			if (Array.isArray(flags)) {
				flags.forEach(flag => {
					if (flag.country) {
						countrySet.add(flag.country);
					}
				});
			}
		}
	}

	return Array.from(countrySet).sort();
}

/**
 * Populate a <select> element with all country names.
 * Used in the win modal so players can pick their country.
 *
 * @param {HTMLSelectElement} selectElement - The <select> to fill
 * @param {string} [placeholder='Select your country'] - Placeholder option text
 * @returns {Promise<void>}
 */
export async function populateCountryDropdown(selectElement, placeholder = 'Select your country') {
	if (!selectElement) return;

	// Clear existing options
	selectElement.innerHTML = `<option value="">${placeholder}</option>`;

	try {
		const allData = await getAllFlagData();
		const countries = getCountryList(allData);

		countries.forEach(name => {
			const option = document.createElement('option');
			option.value = name;
			option.textContent = name;
			selectElement.appendChild(option);
		});
	} catch (error) {
		console.error('Failed to populate country dropdown:', error);
	}
}

/**
 * Get the flag HTML for a specific country.
 * Searches across all cached data for a match.
 *
 * @param {string} countryName - The country to look up (e.g. "Nigeria")
 * @returns {Promise<string>} The flag HTML string, or empty string if not found
 *
 * Usage:
 *   const flagHtml = await getCountryFlag('Nigeria');
 *   // → '<span class="fi fi-ng"></span>'
 */
export async function getCountryFlag(countryName) {
	if (!countryName) return '';

	const allData = await getAllFlagData();

	// Search through every continent → region → flag
	for (const continentName in allData) {
		const continent = allData[continentName];
		for (const regionName in continent) {
			const flags = continent[regionName];
			if (Array.isArray(flags)) {
				const found = flags.find(f => f.country === countryName);
				if (found) {
					return found.flag || '';
				}
			}
		}
	}

	return '';
}

/**
 * **Synchronous** flag lookup — ONLY works after getAllFlagData() has been called.
 *
 * The scores page uses this to render flags in score list items without
 * having to await every single lookup. Call getAllFlagData() first to
 * populate the cache, then use this function for fast lookups.
 *
 * @param {string} countryName - Country to look up
 * @returns {string} Flag HTML, or empty string if not found / data not loaded
 */
export function getCountryFlagSync(countryName) {
	if (!countryName || !cachedData) return '';

	for (const continentName in cachedData) {
		const continent = cachedData[continentName];
		for (const regionName in continent) {
			const flags = continent[regionName];
			if (Array.isArray(flags)) {
				const found = flags.find(f => f.country === countryName);
				if (found) return found.flag || '';
			}
		}
	}

	return '';
}
