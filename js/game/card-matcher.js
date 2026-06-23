/**
 * CardMatcher - Pure match logic for card game
 *
 * Handles card matching, combo tracking, and hint system
 * No DOM manipulation - pure logic only
 *
 * @class CardMatcher
 */
class CardMatcher {
  constructor(options = {}) {
    this.combo = 0;
    this.maxCombo = 0;
    this.totalMatches = 0;
    this.totalMismatches = 0;
    this.matchHistory = [];

    this.onComboChange = options.onComboChange || (() => {});
    this.onMatch = options.onMatch || (() => {});
    this.onMismatch = options.onMismatch || (() => {});
  }

  /**
   * Check if two cards match
   *
   * @param {Object} card1 - First card
   * @param {Object} card2 - Second card
   * @returns {Object} Match result with details
   *
   * @example
   * const result = cardMatcher.checkMatch(
   *   { country: 'Nigeria', index: 0 },
   *   { country: 'Nigeria', index: 3 }
   * );
   * // Returns: { isMatch: true, combo: 1, isCombo: false }
   */
  checkMatch(card1, card2) {
    const isMatch = this.isMatch(card1, card2);

    if (isMatch) {
      this.combo++;
      this.totalMatches++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);

      const result = {
        isMatch: true,
        isCombo: this.combo > 1,
        combo: this.combo,
        maxCombo: this.maxCombo,
        card1Index: card1.index,
        card2Index: card2.index
      };

      this.matchHistory.push({
        type: 'match',
        timestamp: Date.now(),
        ...result
      });

      this.onComboChange(this.combo);
      this.onMatch(result);

      return result;
    } else {
      this.combo = 0;
      this.totalMismatches++;

      const result = {
        isMatch: false,
        isCombo: false,
        combo: 0,
        card1Index: card1.index,
        card2Index: card2.index
      };

      this.matchHistory.push({
        type: 'mismatch',
        timestamp: Date.now(),
        ...result
      });

      this.onComboChange(0);
      this.onMismatch(result);

      return result;
    }
  }

  /**
   * Pure match comparison
   *
   * @param {Object} card1 - First card
   * @param {Object} card2 - Second card
   * @returns {boolean} True if cards match
   */
  isMatch(card1, card2) {
    if (!card1 || !card2) {
      return false;
    }

    return card1.country === card2.country;
  }

  /**
   * Get hint for player
   * Optimized with Map for O(n) instead of O(n²) nested loops
   *
   * @param {Array} cards - All cards
   * @param {Array} flippedCards - Currently flipped cards
   * @param {Array} matchedIndices - Already matched card indices
   * @returns {Object|null} Hint with card indices or null
   */
  getHint(cards, flippedCards, matchedIndices = []) {
    // Find unmatched card indices
    const unmatchedIndices = [];
    for (let i = 0; i < cards.length; i++) {
      if (!matchedIndices.includes(i) &&
          !flippedCards.some(fc => fc.index === i)) {
        unmatchedIndices.push(i);
      }
    }

    if (unmatchedIndices.length < 2) {
      return null;
    }

    // Use Map to group by country for O(n) lookup instead of O(n²) nested loops
    const countryMap = new Map();

    for (const index of unmatchedIndices) {
      const card = cards[index];
      const country = card.country;

      if (countryMap.has(country)) {
        // Found a matching pair!
        return {
          card1Index: countryMap.get(country),
          card2Index: index,
          country: country
        };
      }

      countryMap.set(country, index);
    }

    // No pair found (shouldn't happen in valid game)
    return null;
  }

  /**
   * Reset combo counter
   */
  resetCombo() {
    this.combo = 0;
    this.onComboChange(0);
  }

  /**
   * Get current combo
   *
   * @returns {number} Current combo
   */
  getCombo() {
    return this.combo;
  }

  /**
   * Get max combo
   *
   * @returns {number} Max combo
   */
  getMaxCombo() {
    return this.maxCombo;
  }

  /**
   * Get match statistics
   *
   * @returns {Object} Statistics object
   */
  getStats() {
    const totalAttempts = this.totalMatches + this.totalMismatches;
    const accuracy = totalAttempts > 0
      ? (this.totalMatches / totalAttempts * 100).toFixed(1)
      : 0;

    return {
      combo: this.combo,
      maxCombo: this.maxCombo,
      totalMatches: this.totalMatches,
      totalMismatches: this.totalMismatches,
      totalAttempts,
      accuracy: parseFloat(accuracy),
      matchHistory: this.matchHistory.slice(-20) // Last 20 matches
    };
  }

  /**
   * Reset all statistics
   */
  reset() {
    this.combo = 0;
    this.maxCombo = 0;
    this.totalMatches = 0;
    this.totalMismatches = 0;
    this.matchHistory = [];
    this.onComboChange(0);
  }

}

export default CardMatcher;
export { CardMatcher };
