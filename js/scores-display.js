/**
 * This script runs on the scores page when the DOM is fully loaded.
 * It retrieves high scores from local storage and displays them in a list.
 * If no scores are found, it shows a message indicating that.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we're on the scores page by looking for the high scores list element
    const highScoresList = document.getElementById('high-scores-list');
    const noScoresContainer = document.getElementById('no-scores-container');

    // Only run if we're on the scores page (elements exist)
    if (highScoresList && noScoresContainer) {
        // Preload all flag data for quick lookup
        await preloadFlagData();

        // Retrieve high scores from local storage, defaulting to an empty array
        const highScores = JSON.parse(localStorage.getItem('highScores')) || [];

        if (highScores.length > 0) {
            // If scores exist, display the list and hide the 'no scores' message
            highScoresList.style.display = 'block';
            noScoresContainer.style.display = 'none';
            // Populate the list with score items
            highScoresList.innerHTML = highScores.map(createScoreListItem).join('');
        } else {
            // If no scores exist, hide the list and show the 'no scores' message
            highScoresList.style.display = 'none';
            noScoresContainer.style.display = 'block';
        }
    }
    // If we're not on the scores page, simply don't run the script (no error message)
});

/**
 * Creates an HTML list item string for a given score object.
 * @param {object} score - The score object.
 * @param {string} score.name - The player's name.
 * @param {number} score.moves - The number of moves taken.
 * @param {string} score.time - The time taken.
 * @param {string} score.difficulty - The game difficulty.
 * @param {string} score.region - The game region (e.g., "africa - southern").
 * @param {string} score.playerCountry - The player's selected country.
 * @returns {string} The HTML string for the list item.
 */
function createScoreListItem(score) {
    // Format the region text for display
    const regionText = formatRegion(score.region);
    // Get the flag SVG for the player's country if available
    const playerCountryFlag = score.playerCountry ? getCountryFlagSync(score.playerCountry) : '';

    return `
        <li>
            <span class="player-name">
                ${score.name}, from ${score.playerCountry || ''} ${playerCountryFlag ? `<span class="player-country-flag">${playerCountryFlag}</span>` : ''}
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
 * Gets the flag SVG for a given country by searching through pre-loaded flag data.
 * @param {string} countryName - The name of the country.
 * @returns {string} The SVG HTML string for the flag.
 */
function getCountryFlagSync(countryName) {
    if (!window.allFlagsData) {
        return '';
    }

    // Search through all loaded flag data to find the country
    for (const continent in window.allFlagsData) {
        const continentData = window.allFlagsData[continent];
        for (const region in continentData) {
            const countries = continentData[region];
            const country = countries.find(c => c.country === countryName);
            if (country) {
                return country.flag;
            }
        }
    }

    return '';
}

/**
 * Pre-loads all flag data for quick lookup when displaying scores.
 */
async function preloadFlagData() {
    // Initialize the global variable to store all flag data
    window.allFlagsData = {};

    const continents = ['africa', 'europe', 'asia', 'america'];

    for (const continent of continents) {
        try {
            const response = await fetch(`dist/flags_${continent}.json`);
            if (response.ok) {
                window.allFlagsData[continent] = await response.json();
            }
        } catch (error) {
            console.error(`Error loading flags for ${continent}:`, error);
        }
    }
}

/**
 * Formats the region string for better readability.
 * Example: "africa - southern" becomes "Africa - Southern"
 * Example: "europe - all" becomes "Europe - All"
 * @param {string} regionString - The region string from the score object.
 * @returns {string} The formatted region string.
 */
function formatRegion(regionString) {
    if (typeof regionString !== 'string' || !regionString) {
        return 'Unknown Region';
    }

    // Split the string by the delimiter and capitalize each part
    return regionString
        .split(' - ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' - ');
}