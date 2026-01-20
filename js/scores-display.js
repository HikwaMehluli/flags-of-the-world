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

        // Check authentication status and display appropriate scores
        await initializeScoreDisplay();

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

                // Load scores for the selected continent
                await loadScoresForContinent(continent);
            });
        });

        // Add authentication status listener to update UI when auth state changes
        try {
            const { default: authService } = await import('./auth-service.js');
            authService.onAuthStateChange(async ({ isAuthenticated }) => {
                // If user just logged in, sync their local scores
                if (isAuthenticated) {
                    try {
                        const { default: scoreService } = await import('./score-service.js');
                        await scoreService.syncLocalScores();
                    } catch (syncError) {
                        console.error('Error syncing local scores:', syncError);
                    }
                }

                await updateAuthUI(isAuthenticated);
                await initializeScoreDisplay();
            });

            // Initialize presence service to track online users
            try {
                const { default: presenceService } = await import('./presence-service.js');
                await presenceService.initialize();

                // Listen for online users count changes
                document.addEventListener('onlineUsersCountChanged', (event) => {
                    const onlineUsersCountElement = document.getElementById('online-users-count');
                    if (onlineUsersCountElement) {
                        onlineUsersCountElement.textContent = event.detail.count;
                    }
                });
            } catch (presenceError) {
                console.error('Error initializing presence service:', presenceError);
            }
        } catch (error) {
            console.error('Error setting up auth listener:', error);
        }
    }
    // If we're not on the scores page, simply don't run the script (no error message)
});

/**
 * Initialize score display based on authentication status
 */
async function initializeScoreDisplay() {
    try {
        const { default: authService } = await import('./auth-service.js');
        const isAuthenticated = authService.getIsAuthenticated();

        await updateAuthUI(isAuthenticated);

        // Initialize the score type toggle
        initializeScoreTypeToggle();

        const personalScoresBtn = document.getElementById('personal-scores-btn');

        // Configure based on authentication
        if (isAuthenticated) {
            // Restore "Personal Scores" label
            if (personalScoresBtn) personalScoresBtn.textContent = 'Personal Scores';
        } else {
            // Guest mode behavior
            // "Local Scores" label for guests
            if (personalScoresBtn) personalScoresBtn.textContent = 'Local Scores';
        }

        // Ensure UI reflects the default state
        updateScoreTypeToggleUI();
        enableScoreTypeToggle();

        await loadScoresForContinent('africa'); // Load default continent
    } catch (error) {
        console.error('Error initializing score display:', error);
        // Fallback to local scores
        await loadLocalScoresForContinent('africa');
    }
}

/**
 * Update UI based on authentication status
 */
async function updateAuthUI(isAuthenticated) {
    // Update auth status indicator in header
    const authIndicator = document.getElementById('auth-indicator');
    const authToggleBtn = document.getElementById('auth-toggle-btn');

    if (authIndicator && authToggleBtn) {
        if (isAuthenticated) {
            const currentUser = authService.getCurrentUser();
            const displayName = currentUser?.user_metadata?.full_name ||
                currentUser?.user_metadata?.username ||
                currentUser?.email?.split('@')[0] ||
                'User';
            authIndicator.textContent = displayName;
            authToggleBtn.textContent = 'Logout';
        } else {
            authIndicator.textContent = 'Guest';
            authToggleBtn.textContent = 'Login';
        }
    }
}

// Add variables to track score type
let currentScoreType = 'personal'; // Default to personal/local scores

/**
 * Initialize the score type toggle buttons
 */
function initializeScoreTypeToggle() {
    const globalScoresBtn = document.getElementById('global-scores-btn');
    const personalScoresBtn = document.getElementById('personal-scores-btn');

    if (globalScoresBtn && personalScoresBtn) {
        globalScoresBtn.addEventListener('click', () => {
            currentScoreType = 'global';
            updateScoreTypeToggleUI();
            loadScoresForContinent(getActiveContinent());
        });

        personalScoresBtn.addEventListener('click', () => {
            currentScoreType = 'personal';
            updateScoreTypeToggleUI();
            loadScoresForContinent(getActiveContinent());
        });
    }
}

/**
 * Update the UI for the score type toggle buttons
 */
function updateScoreTypeToggleUI() {
    const globalScoresBtn = document.getElementById('global-scores-btn');
    const personalScoresBtn = document.getElementById('personal-scores-btn');

    if (globalScoresBtn && personalScoresBtn) {
        if (currentScoreType === 'global') {
            globalScoresBtn.classList.add('active');
            personalScoresBtn.classList.remove('active');
        } else {
            globalScoresBtn.classList.remove('active');
            personalScoresBtn.classList.add('active');
        }
    }
}

/**
 * Get the currently active continent tab
 */
function getActiveContinent() {
    const activeTabButton = document.querySelector('.tab-button.active');
    return activeTabButton ? activeTabButton.getAttribute('data-tab') : 'africa';
}

/**
 * Load scores for a specific continent based on current score type selection
 */
async function loadScoresForContinent(continent) {
    try {
        const { default: authService } = await import('./auth-service.js');
        const isAuthenticated = authService.getIsAuthenticated();

        // If not authenticated
        if (!isAuthenticated) {
            if (currentScoreType === 'global') {
                // Trying to view global scores -> show login prompt
                await showLoginPromptForGlobalScores(continent);
            } else {
                // View local scores
                await loadLocalScoresForContinent(continent);
            }
            return;
        }

        // If authenticated, respect the score type toggle
        if (currentScoreType === 'global') {
            // Load global scores from Supabase
            await loadGlobalScoresForContinent(continent);
        } else {
            // Load personal scores from Supabase
            await loadPersonalScoresForContinent(continent);
        }
    } catch (error) {
        console.error(`Error loading scores for ${continent}:`, error);
        // Fallback to local scores
        await loadLocalScoresForContinent(continent);
    }
}

/**
 * Show login prompt when trying to view global scores while not authenticated
 */
async function showLoginPromptForGlobalScores(continent) {
    // Get the score list and no scores container for this continent
    const scoreList = document.querySelector(`.continent-scores-list[data-continent="${continent}"]`);
    const noScoresContainer = document.querySelector(`.no-scores-container[data-continent="${continent}"]`);

    // Show a login prompt instead of scores
    if (scoreList) {
        scoreList.style.display = 'none';
    }

    if (noScoresContainer) {
        noScoresContainer.style.display = 'block';
        noScoresContainer.innerHTML = `
            <p>To view global scores, please log in or create an account.</p>
            <button id="login-prompt-btn" class="btn-play-game">Login / Sign Up</button>
        `;

        // Add event listener to the login button
        const loginPromptBtn = document.getElementById('login-prompt-btn');
        if (loginPromptBtn) {
            loginPromptBtn.addEventListener('click', () => {
                // Show the login modal
                const loginModal = document.getElementById('login-modal');
                if (loginModal) {
                    loginModal.style.display = 'flex';
                }
            });
        }
    }
}

/**
 * Disable the score type toggle when user is not authenticated
 */
function disableScoreTypeToggle() {
    const globalScoresBtn = document.getElementById('global-scores-btn');
    const personalScoresBtn = document.getElementById('personal-scores-btn');

    if (globalScoresBtn) {
        globalScoresBtn.classList.add('active');
        globalScoresBtn.classList.add('disabled');
    }
    if (personalScoresBtn) {
        personalScoresBtn.classList.remove('active');
        personalScoresBtn.classList.add('disabled');
    }
}

/**
 * Enable the score type toggle when user is authenticated
 */
function enableScoreTypeToggle() {
    const globalScoresBtn = document.getElementById('global-scores-btn');
    const personalScoresBtn = document.getElementById('personal-scores-btn');

    if (globalScoresBtn) {
        globalScoresBtn.classList.remove('disabled');
    }
    if (personalScoresBtn) {
        personalScoresBtn.classList.remove('disabled');
    }
}

/**
 * Load global scores for a specific continent from Supabase
 */
async function loadGlobalScoresForContinent(continent) {
    try {
        // Show loading indicator
        showLoadingIndicator(continent);

        const { default: scoreService } = await import('./score-service.js');

        // Fetch scores for all difficulties for the continent
        const difficulties = ['easy', 'medium', 'hard'];
        let allScores = [];

        for (const difficulty of difficulties) {
            try {
                const scores = await scoreService.fetchGlobalScores(continent, difficulty);
                allScores = allScores.concat(scores);
            } catch (error) {
                console.warn(`No global scores for ${continent} - ${difficulty}:`, error.message);
            }
        }

        // Sort all scores by moves and time
        allScores.sort((a, b) => {
            if (a.moves !== b.moves) return a.moves - b.moves;
            return a.time.localeCompare(b.time);
        });

        // Get the score list and no scores container for this continent
        const scoreList = document.querySelector(`.continent-scores-list[data-continent="${continent}"]`);
        const noScoresContainer = document.querySelector(`.no-scores-container[data-continent="${continent}"]`);

        if (allScores.length > 0) {
            // If scores exist, display the list and hide the 'no scores' message
            scoreList.style.display = 'block';
            noScoresContainer.style.display = 'none';

            // Populate the list with score items
            scoreList.innerHTML = allScores.map(createGlobalScoreListItem).join('');
        } else {
            // If no scores exist, hide the list and show the 'no scores' message
            scoreList.style.display = 'none';
            noScoresContainer.style.display = 'block';
        }

        // Hide loading indicator
        hideLoadingIndicator(continent);
    } catch (error) {
        console.error(`Error loading global scores for ${continent}:`, error);
        // Hide loading indicator
        hideLoadingIndicator(continent);
        // Fallback to local scores
        await loadLocalScoresForContinent(continent);
    }
}

/**
 * Show loading indicator for a specific continent
 */
function showLoadingIndicator(continent) {
    const scoreList = document.querySelector(`.continent-scores-list[data-continent="${continent}"]`);
    const noScoresContainer = document.querySelector(`.no-scores-container[data-continent="${continent}"]`);

    if (scoreList) {
        scoreList.innerHTML = '<li class="loading-indicator">Loading global scores...</li>';
        scoreList.style.display = 'block';
    }

    if (noScoresContainer) {
        noScoresContainer.style.display = 'none';
    }
}

/**
 * Hide loading indicator for a specific continent
 */
function hideLoadingIndicator(continent) {
    const scoreList = document.querySelector(`.continent-scores-list[data-continent="${continent}"]`);

    if (scoreList && scoreList.querySelector('.loading-indicator')) {
        scoreList.innerHTML = '';
    }
}

/**
 * Load personal scores for a specific continent from Supabase
 */
async function loadPersonalScoresForContinent(continent) {
    try {
        const { default: scoreService } = await import('./score-service.js');

        // Fetch user's personal scores for the continent
        const scores = await scoreService.fetchUserScores();

        // Filter scores for the specific continent
        const continentScores = scores.filter(score => score.continent === continent);

        // Sort scores by moves and time
        continentScores.sort((a, b) => {
            if (a.moves !== b.moves) return a.moves - b.moves;
            return a.time.localeCompare(b.time);
        });

        // Get the score list and no scores container for this continent
        const scoreList = document.querySelector(`.continent-scores-list[data-continent="${continent}"]`);
        const noScoresContainer = document.querySelector(`.no-scores-container[data-continent="${continent}"]`);

        if (continentScores.length > 0) {
            // If scores exist, display the list and hide the 'no scores' message
            scoreList.style.display = 'block';
            noScoresContainer.style.display = 'none';

            // Populate the list with score items
            scoreList.innerHTML = continentScores.map(createGlobalScoreListItem).join('');
        } else {
            // If no scores exist, hide the list and show the 'no scores' message
            scoreList.style.display = 'none';
            noScoresContainer.style.display = 'block';
        }
    } catch (error) {
        console.error(`Error loading personal scores for ${continent}:`, error);
        // Fallback to local scores
        await loadLocalScoresForContinent(continent);
    }
}

/**
 * Load local scores for a specific continent from localStorage
 */
async function loadLocalScoresForContinent(continent) {
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

/**
 * Creates an HTML list item string for a global score object from Supabase.
 * @param {object} score - The score object from Supabase.
 * @returns {string} The HTML string for the list item.
 */
function createGlobalScoreListItem(score) {
    // Format the region text for display, showing only the region part since continent is indicated by tab
    const regionText = formatRegion(score.region, false);

    // Get the flag SVG for the player's country if available
    const playerCountryFlag = score.player_country ? getCountryFlagSync(score.player_country) : '';

    return `
        <li>
            <span class="player-name">
                ${score.name || score.users?.full_name || score.users?.username || 'Anonymous'}, from ${score.player_country || ''} ${playerCountryFlag ? `<span class="player-country-flag">${playerCountryFlag}</span>` : ''}
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