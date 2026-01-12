/**
 * Profile statistics visualization component
 */
class ProfileStats {
  constructor() {
    this.charts = {};
  }

  /**
   * Initialize the profile statistics component
   */
  async initialize() {
    // Initialize charts if on profile page
    if (document.querySelector('.profile-content')) {
      await this.loadAndRenderCharts();
    }
  }

  /**
   * Load user statistics and render charts
   */
  async loadAndRenderCharts() {
    try {
      const { default: profileService } = await import('./profile-service.js');
      const stats = await profileService.getUserStats();

      // Render charts with user statistics
      await this.renderCharts(stats);
    } catch (error) {
      console.error('Error loading and rendering profile charts:', error);
    }
  }

  /**
   * Render charts with user statistics
   */
  async renderCharts(stats) {
    try {
      // Import Chart.js configurations
      const { gamesOverTimeConfig, performanceByDifficultyConfig, performanceByContinentConfig } = await import('./charts-config.js');

      // Render games over time chart
      if (stats.gamesOverTime.dates.length > 0) {
        const ctx1 = document.getElementById('games-over-time-chart');
        if (ctx1) {
          if (this.charts.gamesOverTime) {
            this.charts.gamesOverTime.destroy();
          }
          
          this.charts.gamesOverTime = new Chart(ctx1, {
            ...gamesOverTimeConfig,
            data: {
              labels: stats.gamesOverTime.dates,
              datasets: [{
                label: 'Games Played',
                data: stats.gamesOverTime.counts,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)'
              }]
            }
          });
        }
      }

      // Render performance by difficulty chart
      const difficultyKeys = Object.keys(stats.performanceByDifficulty);
      if (difficultyKeys.length > 0) {
        const avgMoves = difficultyKeys.map(diff => stats.performanceByDifficulty[diff].avgMoves);
        const avgTimes = difficultyKeys.map(diff => stats.performanceByDifficulty[diff].avgTime);

        const ctx2 = document.getElementById('performance-by-difficulty-chart');
        if (ctx2) {
          if (this.charts.performanceByDifficulty) {
            this.charts.performanceByDifficulty.destroy();
          }
          
          this.charts.performanceByDifficulty = new Chart(ctx2, {
            ...performanceByDifficultyConfig,
            data: {
              labels: difficultyKeys,
              datasets: [
                {
                  label: 'Average Moves',
                  data: avgMoves,
                  backgroundColor: 'rgba(255, 99, 132, 0.2)',
                  borderColor: 'rgb(255, 99, 132)',
                  borderWidth: 1
                },
                {
                  label: 'Average Time (seconds)',
                  data: avgTimes,
                  backgroundColor: 'rgba(54, 162, 235, 0.2)',
                  borderColor: 'rgb(54, 162, 235)',
                  borderWidth: 1
                }
              ]
            }
          });
        }
      }

      // Render performance by continent chart
      const continentKeys = Object.keys(stats.performanceByContinent);
      if (continentKeys.length > 0) {
        const avgMoves = continentKeys.map(cont => stats.performanceByContinent[cont].avgMoves);
        const avgTimes = continentKeys.map(cont => stats.performanceByContinent[cont].avgTime);

        const ctx3 = document.getElementById('performance-by-continent-chart');
        if (ctx3) {
          if (this.charts.performanceByContinent) {
            this.charts.performanceByContinent.destroy();
          }
          
          this.charts.performanceByContinent = new Chart(ctx3, {
            ...performanceByContinentConfig,
            data: {
              labels: continentKeys,
              datasets: [
                {
                  label: 'Average Moves',
                  data: avgMoves,
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  borderColor: 'rgb(75, 192, 192)',
                  borderWidth: 1
                },
                {
                  label: 'Average Time (seconds)',
                  data: avgTimes,
                  backgroundColor: 'rgba(153, 102, 255, 0.2)',
                  borderColor: 'rgb(153, 102, 255)',
                  borderWidth: 1
                }
              ]
            }
          });
        }
      }
    } catch (error) {
      console.error('Error rendering charts:', error);
    }
  }

  /**
   * Update statistics display
   */
  updateStatsDisplay(stats) {
    // Update stat cards
    const totalGamesEl = document.getElementById('total-games');
    const bestMovesEl = document.getElementById('best-moves');
    const bestTimeEl = document.getElementById('best-time');
    
    if (totalGamesEl) totalGamesEl.textContent = stats.totalGames || 0;
    if (bestMovesEl) bestMovesEl.textContent = stats.bestMoves || '-';
    if (bestTimeEl) bestTimeEl.textContent = stats.bestTime || '-';
  }

  /**
   * Update rankings display
   */
  async updateRankingsDisplay() {
    try {
      const { default: profileService } = await import('./profile-service.js');
      const rankings = await profileService.getUserRankings();

      // Update ranking elements
      const globalRankEl = document.getElementById('global-ranking');
      const africaRankEl = document.getElementById('africa-ranking');
      const europeRankEl = document.getElementById('europe-ranking');
      const asiaRankEl = document.getElementById('asia-ranking');
      const americaRankEl = document.getElementById('america-ranking');

      if (globalRankEl) globalRankEl.textContent = `#${rankings.global.rank}`;
      if (africaRankEl) africaRankEl.textContent = `#${rankings.africa.rank}`;
      if (europeRankEl) europeRankEl.textContent = `#${rankings.europe.rank}`;
      if (asiaRankEl) asiaRankEl.textContent = `#${rankings.asia.rank}`;
      if (americaRankEl) americaRankEl.textContent = `#${rankings.america.rank}`;
    } catch (error) {
      console.error('Error updating rankings display:', error);
    }
  }

  /**
   * Destroy all charts to free up resources
   */
  destroyCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    this.charts = {};
  }
}

// Initialize the profile stats component when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Only initialize if we're on the profile page
  if (document.querySelector('.profile-content')) {
    const profileStats = new ProfileStats();
    await profileStats.initialize();
    
    // Make it globally available if needed
    window.profileStatsComponent = profileStats;
  }
});

// Export the class for potential use in other modules
export default ProfileStats;