/**
 * This script runs on the scores page when the DOM is fully loaded.
 * It retrieves high scores from local storage and displays them in a list by continent.
 * If no scores are found for a continent, it shows a message indicating that.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we're on the scores page by looking for the tab elements
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const continentScoreLists = document.querySelectorAll('.continent-scores-list');
    const noScoresContainers = document.querySelectorAll('.no-scores-container');

    // Only run if we're on the scores page (elements exist)
    if (tabButtons.length > 0 && continentScoreLists.length > 0) {
        // Preload all flag data for quick lookup
        await preloadFlagData();

        // Display scores for each continent
        await displayScoresByContinent();

        // Add event listeners to tab buttons
        tabButtons.forEach(button => {
            button.addEventListener('click', async () => {
                // Remove active class from all buttons
                tabButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');

                // Hide all tab contents
                tabContents.forEach(content => {
                    content.style.display = 'none';
                });

                // Show the selected tab content
                const continent = button.getAttribute('data-tab');
                document.getElementById(`${continent}-tab`).style.display = 'block';
            });
        });
    }
    // If we're not on the scores page, simply don't run the script (no error message)
});

/**
 * Displays scores for each continent from continent-specific storage
 */
async function displayScoresByContinent() {
    const continents = ['africa', 'america', 'asia', 'europe'];

    for (const continent of continents) {
        // Load scores for this specific continent
        const continentScoresKey = `highScores_${continent}`;
        const continentScores = JSON.parse(localStorage.getItem(continentScoresKey)) || [];

        // Get the score list and no scores container for this continent
        const scoreList = document.querySelector(`.continent-scores-list[data-continent="${continent}"]`);
        const noScoresContainer = document.querySelector(`.no-scores-container[data-continent="${continent}"]`);

        if (continentScores.length > 0) {
            // If scores exist, display the list and hide the 'no scores' message
            scoreList.style.display = 'block';
            noScoresContainer.style.display = 'none';
            // Populate the list with score items
            scoreList.innerHTML = continentScores.map(createScoreListItem).join('');
        } else {
            // If no scores exist, hide the list and show the 'no scores' message
            scoreList.style.display = 'none';
            noScoresContainer.style.display = 'block';
        }
    }
}

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
    // Format the region text for display, showing only the region part since continent is indicated by tab
    // - When showContinent is true(default ), it displays the full format(e.g., "Africa - Southern Africa")
    // - When showContinent is false, it displays only the region part(e.g., "Southern Africa")
    const regionText = formatRegion(score.region, false);
    
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
 * Example: "africa - southern" becomes "Africa - Southern" (when showContinent=true)
 * Example: "africa - southern" becomes "Southern" (when showContinent=false)
 * Example: "europe - all" becomes "Europe - All" (when showContinent=true)
 * Example: "europe - all" becomes "All" (when showContinent=false)
 * @param {string} regionString - The region string from the score object.
 * @param {boolean} showContinent - Whether to include the continent in the formatted string (default: true).
 * @returns {string} The formatted region string.
 */
function formatRegion(regionString, showContinent = true) {
    if (typeof regionString !== 'string' || !regionString) {
        return 'Unknown Region';
    }

    // Split the string by the delimiter and capitalize each part
    const parts = regionString.split(' - ').map(part => part.charAt(0).toUpperCase() + part.slice(1));

    if (showContinent) {
        // Return both continent and region parts
        return parts.join(' - ');
    } else {
        // Return only the region part (skip the continent)
        return parts.length > 1 ? parts[1] : parts[0];
    }
}