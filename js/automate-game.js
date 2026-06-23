/**
 * AUTOMATE GAME - for testing purposes only
 * This is a cheat mode code to be the ultimate winner of the game
 * Paste this entire script into your browsers DevTools Console
 *
 * It will:
 *   - Wait for the game board to load
 *   - Read all card positions from the DOM
 *   - Click matching pairs with proper timing
 *   - Complete the game within seconds
 */
(async () => {
	const wait = ms => new Promise(r => setTimeout(r, ms));

	// Wait for cards to appear
	while (!document.querySelector('.card')) {
		console.log('Waiting for game board...');
		await wait(500);
	}

	// Read country names from each card's DOM (data-tippy-content)
	const cards = document.querySelectorAll('.card');
	const cardData = [];
	cards.forEach(card => {
		const idx = parseInt(card.dataset.index);
		const front = card.querySelector('.card-front');
		const country = front ? front.dataset.tippyContent : null;
		if (country !== null) {
			cardData.push({ index: idx, country, element: card });
		}
	});

	// Group indices by country name to find pairs
	const pairs = {};
	cardData.forEach(({ index, country }) => {
		if (!pairs[country]) pairs[country] = [];
		pairs[country].push(index);
	});

	const pairCount = Object.keys(pairs).length;
	console.log(`Found ${pairCount} pairs to match`);

	// Click each pair in sequence
	for (const [country, indices] of Object.entries(pairs)) {
		if (indices.length !== 2) {
			console.warn(`Skipping "${country}" — unexpected ${indices.length} cards`);
			continue;
		}

		// Click first card
		document.querySelector(`[data-index="${indices[0]}"]`).click();
		await wait(150);

		// Click second card
		document.querySelector(`[data-index="${indices[1]}"]`).click();

		// Wait for game's checkMatch() to fire (1000ms timeout + buffer)
		await wait(1200);
	}

	console.log('Game completed!');
})();
