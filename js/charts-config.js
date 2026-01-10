/**
 * Chart.js configurations for profile statistics
 */

// Configuration for games over time chart
export const gamesOverTimeConfig = {
  type: 'line',
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Games Played Over Time'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Games'
        }
      }
    }
  }
};

// Configuration for performance by difficulty chart
export const performanceByDifficultyConfig = {
  type: 'bar',
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Average Performance by Difficulty'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Average Value'
        }
      }
    }
  }
};

// Configuration for performance by continent chart
export const performanceByContinentConfig = {
  type: 'radar',
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Performance by Continent'
      }
    }
  }
};