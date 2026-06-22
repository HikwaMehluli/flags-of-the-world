/**
 * Country utility functions for dropdown population and flag data
 * @module utils/country-utils
 */

// Cache for flag data to reduce redundant network requests
let flagDataCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for country-to-flag lookup for O(1) access
let countryFlagMapCache = null;
let countryMapTimestamp = 0;

/**
 * Build country-to-flag map for fast lookup
 * @param {Object} allFlagsData - Flag data from getAllFlagData()
 * @returns {Object} Map of country names to flag data
 */
function buildCountryFlagMap(allFlagsData) {
	const countryMap = {};

	for (const continent of Object.values(allFlagsData)) {
		for (const region of Object.values(continent)) {
			if (Array.isArray(region)) {
				region.forEach(flag => {
					if (flag.country) {
						countryMap[flag.country] = flag;
					}
				});
			}
		}
	}

	return countryMap;
}

/**
 * Fetch all flag data from all continents with caching
 * @returns {Promise<Object>} Object with continent keys and flag data values
 */
export async function getAllFlagData() {
	// Return cached data if still valid
	if (flagDataCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
		return flagDataCache;
	}

	const continents = ['africa', 'europe', 'asia', 'america'];
	const allFlagsData = {};

	for (const continent of continents) {
		try {
			const response = await fetch(`api/countries/flags_${continent}.json`);
			if (response.ok) {
				allFlagsData[continent] = await response.json();
			}
		} catch (error) {
			console.error(`Error loading flags for ${continent}:`, error);
		}
	}

	// Cache the results
	flagDataCache = allFlagsData;
	cacheTimestamp = Date.now();

	// Also rebuild country flag map cache
	countryFlagMapCache = buildCountryFlagMap(allFlagsData);
	countryMapTimestamp = Date.now();

	return allFlagsData;
}

/**
 * Clear the flag data cache (useful for testing or forced refresh)
 */
export function clearFlagDataCache() {
	flagDataCache = null;
	cacheTimestamp = 0;
	countryFlagMapCache = null;
	countryMapTimestamp = 0;
}

/**
 * Get a sorted list of all country names
 * @param {Object} allFlagsData - Flag data from getAllFlagData()
 * @returns {string[]} Sorted array of country names
 */
export function getCountryList(allFlagsData) {
	if (!allFlagsData || typeof allFlagsData !== 'object') {
		return [];
	}

	const countries = new Set();

	for (const continent of Object.values(allFlagsData)) {
		for (const region of Object.values(continent)) {
			if (Array.isArray(region)) {
				region.forEach(flag => {
					if (flag.country) {
						countries.add(flag.country);
					}
				});
			}
		}
	}

	return Array.from(countries).sort();
}

/**
 * Populate a country dropdown select element
 * @param {HTMLSelectElement} selectElement - Select element to populate
 * @param {string} [placeholder="Select your country"] - Placeholder option text
 * @param {string} [selectedValue=""] - Value to pre-select
 * @returns {Promise<void>}
 */
export async function populateCountryDropdown(selectElement, placeholder = 'Select your country', selectedValue = '') {
	if (!selectElement) {
		console.warn('No select element provided to populateCountryDropdown');
		return;
	}

	// Clear existing options except the first one
	selectElement.innerHTML = `<option value="">${placeholder}</option>`;

	try {
		const allFlagsData = await getAllFlagData();
		const countries = getCountryList(allFlagsData);

		countries.forEach(country => {
			const option = document.createElement('option');
			option.value = country;
			option.textContent = country;
			if (country === selectedValue) {
				option.selected = true;
			}
			selectElement.appendChild(option);
		});
	} catch (error) {
		console.error('Error populating country dropdown:', error);
	}
}

/**
 * Get flag SVG for a specific country (O(1) lookup with cache)
 * @param {string} countryName - Country name
 * @param {Object} [allFlagsData] - Pre-loaded flag data (optional)
 * @returns {Promise<string>} Flag SVG HTML string
 */
export async function getCountryFlag(countryName, allFlagsData = null) {
	if (!countryName) return '';

	// Use cached country map if available and fresh
	if (countryFlagMapCache && (Date.now() - countryMapTimestamp) < CACHE_DURATION) {
		const flag = countryFlagMapCache[countryName];
		return flag ? flag.flag : '';
	}

	// Rebuild cache if needed
	const data = allFlagsData || await getAllFlagData();

	// If we just fetched data, the cache should be built
	if (countryFlagMapCache) {
		const flag = countryFlagMapCache[countryName];
		return flag ? flag.flag : '';
	}

	// Fallback to linear search (shouldn't happen normally)
	for (const continent of Object.values(data)) {
		for (const region of Object.values(continent)) {
			if (Array.isArray(region)) {
				const country = region.find(c => c.country === countryName);
				if (country && country.flag) {
					return country.flag;
				}
			}
		}
	}

	return '';
}

/**
 * Get country data (flag and info) for a specific country (O(1) lookup with cache)
 * @param {string} countryName - Country name
 * @returns {Promise<Object|null>} Country data object or null
 */
export async function getCountryData(countryName) {
	if (!countryName) return null;

	// Use cached country map if available and fresh
	if (countryFlagMapCache && (Date.now() - countryMapTimestamp) < CACHE_DURATION) {
		return countryFlagMapCache[countryName] || null;
	}

	// Rebuild cache if needed
	await getAllFlagData();

	// If cache was built, use it
	if (countryFlagMapCache) {
		return countryFlagMapCache[countryName] || null;
	}

	// Fallback to linear search (shouldn't happen normally)
	const allFlagsData = await getAllFlagData();

	for (const continent of Object.values(allFlagsData)) {
		for (const region of Object.values(continent)) {
			if (Array.isArray(region)) {
				const country = region.find(c => c.country === countryName);
				if (country) {
					return country;
				}
			}
		}
	}

	return null;
}
