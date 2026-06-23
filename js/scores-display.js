/**
 * This script runs on the scores page when the DOM is fully loaded.
 * It retrieves high scores from IndexedDB and displays them in a list by continent.
 */

import { showConfirmModal } from './score/confirm-modal.js';

document.addEventListener('DOMContentLoaded', async () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const continentScoreLists = document.querySelectorAll('.continent-scores-list');
    const noScoresContainers = document.querySelectorAll('.no-scores-container');

    if (tabButtons.length > 0 && continentScoreLists.length > 0) {
        await preloadFlagData();

        tabButtons.forEach(button => {
            button.addEventListener('click', async () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                tabContents.forEach(content => {
                    content.style.display = 'none';
                });

                const continent = button.getAttribute('data-tab');
                document.getElementById(`${continent}-tab`).style.display = 'block';
                await loadLocalScoresForContinent(continent);
            });
        });

        // Player filter listeners
        document.querySelectorAll('.player-filter').forEach(select => {
            select.addEventListener('change', () => {
                const continent = select.getAttribute('data-continent');
                loadLocalScoresForContinent(continent);
            });
        });

        // Clear scores per continent
        document.querySelectorAll('.clear-scores').forEach(btn => {
            btn.addEventListener('click', async () => {
                const continent = btn.getAttribute('data-continent');
                const confirmed = await showConfirmModal(`Clear all scores for ${continent}? This cannot be undone.`);
                if (confirmed) {
                    const { default: scoreManager } = await import('./score/score-manager.js');
                    await scoreManager.clearScores(continent);
                    const { showSuccessToast } = await import('./utils/toast.js');
                    showSuccessToast(`Scores for ${continent} cleared.`);
                    loadLocalScoresForContinent(continent);
                }
            });
        });

        await loadLocalScoresForContinent('africa');
    }
});

async function loadLocalScoresForContinent(continent) {
    try {
        const { default: scoreManager } = await import('./score/score-manager.js');
        const continentScores = await scoreManager.getScores(continent);

        const scoreList = document.querySelector(`.continent-scores-list[data-continent="${continent}"]`);
        const noScoresContainer = document.querySelector(`.no-scores-container[data-continent="${continent}"]`);
        const filterSelect = document.querySelector(`.player-filter[data-continent="${continent}"]`);
        const scoreControls = filterSelect ? filterSelect.closest('.score-controls') : null;

        if (continentScores && continentScores.length > 0) {
            scoreList.style.display = 'block';
            noScoresContainer.style.display = 'none';
            if (scoreControls) scoreControls.style.display = '';

            populatePlayerFilter(filterSelect, continentScores);
            const filterValue = filterSelect ? filterSelect.value : '';
            let filtered = continentScores;
            if (filterValue) {
                filtered = filtered.filter(s => s.name === filterValue);
            }

            const topScores = filtered.slice(0, 100);

            scoreList.innerHTML = topScores.map((score, index) => createScoreListItem(score, index)).join('');
        } else {
            scoreList.style.display = 'none';
            noScoresContainer.style.display = 'block';
            if (scoreControls) scoreControls.style.display = 'none';
            noScoresContainer.innerHTML = '<p>No local scores yet. Play a game to set a record!</p><a href="index.html" class="btn-play-game">Play Game</a>';
        }
    } catch (error) {
        console.error(`Error loading local scores for ${continent}:`, error);
        loadLocalScoresFromLocalStorage(continent);
    }
}

function populatePlayerFilter(select, scores) {
    const currentValue = select.value;
    select.innerHTML = '<option value="">All Players</option>';
    const names = [...new Set(scores.map(s => s.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    names.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.innerHTML = name;
        select.appendChild(opt);
    });
    if (currentValue && names.includes(currentValue)) {
        select.value = currentValue;
    }
}

function loadLocalScoresFromLocalStorage(continent) {
    const continentScoresKey = `highScores_${continent}`;
    const continentScores = JSON.parse(localStorage.getItem(continentScoresKey)) || [];

    const scoreList = document.querySelector(`.continent-scores-list[data-continent="${continent}"]`);
    const noScoresContainer = document.querySelector(`.no-scores-container[data-continent="${continent}"]`);

    if (continentScores.length > 0) {
        scoreList.style.display = 'block';
        noScoresContainer.style.display = 'none';
        scoreList.innerHTML = continentScores.map(createScoreListItem).join('');
    } else {
        scoreList.style.display = 'none';
        noScoresContainer.style.display = 'block';
        noScoresContainer.innerHTML = '<p>No local scores yet. Play a game to set a record!</p><a href="index.html" class="btn-play-game">Play Game</a>';
    }
}

function createScoreListItem(score, index) {
    const rank = index + 1;
    let rankDisplay;
    if (rank === 1) rankDisplay = '&#x1F947;';
    else if (rank === 2) rankDisplay = '&#x1F948;';
    else if (rank === 3) rankDisplay = '&#x1F949;';
    else rankDisplay = `${rank}.`;

    const regionText = formatRegion(score.region, false);
    const playerCountryFlag = score.playerCountry ? getCountryFlagSync(score.playerCountry) : '';

    return `
        <li>
            <span class="score-rank">${rankDisplay}</span>
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

function getCountryFlagSync(countryName) {
    if (!window.allFlagsData) {
        return '';
    }

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

async function preloadFlagData() {
    window.allFlagsData = {};

    const continents = ['africa', 'europe', 'asia', 'america'];

    for (const continent of continents) {
        try {
            const response = await fetch(`api/countries/flags_${continent}.json`);
            if (response.ok) {
                window.allFlagsData[continent] = await response.json();
            }
        } catch (error) {
            console.error(`Error loading flags for ${continent}:`, error);
        }
    }
}

function formatRegion(regionString, showContinent = true) {
    if (typeof regionString !== 'string' || !regionString) {
        return 'Unknown Region';
    }

    const parts = regionString.split(' - ').map(part => part.charAt(0).toUpperCase() + part.slice(1));

    if (showContinent) {
        return parts.join(' - ');
    } else {
        return parts.length > 1 ? parts[1] : parts[0];
    }
}
