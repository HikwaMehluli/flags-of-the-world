document.addEventListener('DOMContentLoaded', async () => {
  const statsSection = document.querySelector('.stats-section');
  if (!statsSection) return;

  try {
    const { default: scoreManager } = await import('./score/score-manager.js');
    const allScores = await scoreManager.getAllScores();

    renderCareerStats(allScores);
    renderContinentStats(allScores);
  } catch (error) {
    console.error('Error loading profile stats:', error);
  }
});

function renderCareerStats(allScores) {
  const totalGames = allScores.length;
  document.getElementById('total-games').textContent = totalGames;

  if (totalGames === 0) return;

  const bestMoves = allScores.reduce((best, s) => s.moves < best ? s.moves : best, Infinity);
  document.getElementById('best-moves').textContent = bestMoves;

  const bestTime = allScores.reduce((best, s) => {
    return compareTimes(s.time, best) < 0 ? s.time : best;
  }, allScores[0].time);
  document.getElementById('best-time').textContent = bestTime;

  const uniqueCountries = new Set();
  allScores.forEach(s => {
    if (s.playerCountry) uniqueCountries.add(s.playerCountry);
  });
  document.getElementById('total-countries').textContent = uniqueCountries.size;
}

function renderContinentStats(allScores) {
  const container = document.getElementById('continent-stats');
  const continents = ['africa', 'america', 'asia', 'europe'];

  container.innerHTML = continents.map(continent => {
    const continentScores = allScores.filter(s => s.continent === continent);
    const count = continentScores.length;
    const best = count > 0 ? continentScores.reduce((b, s) => s.moves < b.moves ? s : b) : null;

    return `
      <div class="stat-card">
        <h3>${continent.charAt(0).toUpperCase() + continent.slice(1)}</h3>
        <p>Games: ${count}</p>
        ${best ? `<p>Best: ${best.moves} moves, ${best.time}</p>` : '<p>No games played</p>'}
      </div>
    `;
  }).join('');
}

function compareTimes(a, b) {
  const [am, as] = a.split(':').map(Number);
  const [bm, bs] = b.split(':').map(Number);
  return (am * 60 + as) - (bm * 60 + bs);
}
