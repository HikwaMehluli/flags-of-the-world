import authService, { supabase } from './auth-service.js';

// Check if Supabase is properly initialized
const isSupabaseInitialized = () => {
  return supabase !== null;
};

/**
 * Score service module for handling global scoring system
 */
class ScoreService {
  constructor() {
    // Cache to minimize API calls
    this.globalScoresCache = {};
    this.userScoresCache = null;
    this.cacheExpiryTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Save a score to Supabase
   */
  async saveScore(scoreData) {
    if (!isSupabaseInitialized()) {
      console.warn('Supabase is not initialized. Score will not be saved to global leaderboard.');
      return null;
    }

    // Add user_id if authenticated
    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.id;
    if (!userId) {
      throw new Error('User must be authenticated to save score to global leaderboard');
    }

    const scoreRecord = {
      user_id: userId,
      name: scoreData.name || currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0],
      moves: scoreData.moves,
      time: scoreData.time,
      difficulty: scoreData.difficulty,
      region: scoreData.region,
      player_country: scoreData.player_country || currentUser?.user_metadata?.country || '',
      continent: scoreData.continent,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('scores')
        .insert([scoreRecord])
        .select()
        .single();

      if (error) {
        console.error('Error saving score:', error.message);
        throw new Error(error.message);
      }

      // Invalidate the cache for this continent/difficulty
      this.invalidateCache(scoreData.continent, scoreData.difficulty);

      return data;
    } catch (error) {
      console.error('Error in saveScore:', error);
      throw error;
    }
  }

  /**
   * Fetch global scores for a specific continent and difficulty
   */
  async fetchGlobalScores(continent, difficulty, limit = 50) {
    if (!isSupabaseInitialized()) {
      console.warn('Supabase is not initialized. Returning empty scores.');
      return [];
    }

    // Check if we have cached data that's still valid
    const cacheKey = `${continent}-${difficulty}`;
    const cachedData = this.globalScoresCache[cacheKey];

    if (cachedData &&
        cachedData.timestamp &&
        Date.now() - cachedData.timestamp < this.cacheExpiryTime) {
      return cachedData.data;
    }

    try {
      const { data, error } = await supabase
        .from('scores')
        .select(`
          id,
          name,
          moves,
          time,
          difficulty,
          region,
          player_country,
          continent,
          created_at,
          users (username, full_name, avatar_url)
        `)
        .eq('continent', continent)
        .eq('difficulty', difficulty)
        .order('moves', { ascending: true })
        .order('time', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching global scores:', error.message);
        throw new Error(error.message);
      }

      // Cache the results
      this.globalScoresCache[cacheKey] = {
        data: data,
        timestamp: Date.now()
      };

      return data;
    } catch (error) {
      console.error('Error in fetchGlobalScores:', error);
      throw error;
    }
  }

  /**
   * Fetch user's personal scores
   */
  async fetchUserScores(userId = null) {
    if (!isSupabaseInitialized()) {
      console.warn('Supabase is not initialized. Returning empty scores.');
      return [];
    }

    const userIdToUse = userId || authService.getCurrentUser()?.id;
    if (!userIdToUse) {
      throw new Error('No user ID provided and no authenticated user');
    }

    // Check if we have cached data that's still valid
    if (this.userScoresCache &&
        this.userScoresCache.timestamp &&
        Date.now() - this.userScoresCache.timestamp < this.cacheExpiryTime) {
      return this.userScoresCache.data;
    }

    try {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', userIdToUse)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user scores:', error.message);
        throw new Error(error.message);
      }

      // Cache the results
      this.userScoresCache = {
        data: data,
        timestamp: Date.now()
      };

      return data;
    } catch (error) {
      console.error('Error in fetchUserScores:', error);
      throw error;
    }
  }

  /**
   * Fetch top scores for all continents and difficulties
   */
  async fetchAllGlobalScores() {
    if (!isSupabaseInitialized()) {
      console.warn('Supabase is not initialized. Returning empty scores.');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('scores')
        .select(`
          id,
          name,
          moves,
          time,
          difficulty,
          region,
          player_country,
          continent,
          created_at,
          users (username, full_name, avatar_url)
        `)
        .order('moves', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        console.error('Error fetching all global scores:', error.message);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in fetchAllGlobalScores:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific continent/difficulty
   */
  invalidateCache(continent, difficulty) {
    if (continent && difficulty) {
      const cacheKey = `${continent}-${difficulty}`;
      delete this.globalScoresCache[cacheKey];
    } else {
      // Clear all global scores cache
      this.globalScoresCache = {};
    }
    
    // Clear user scores cache
    this.userScoresCache = null;
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.globalScoresCache = {};
    this.userScoresCache = null;
  }

  /**
   * Get user's best score for a specific continent and difficulty
   */
  async getUserBestScore(continent, difficulty) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.id;
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', userId)
      .eq('continent', continent)
      .eq('difficulty', difficulty)
      .order('moves', { ascending: true })
      .order('time', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching user best score:', error.message);
      throw new Error(error.message);
    }

    return data || null;
  }

  /**
   * Get user's ranking for a specific continent and difficulty
   */
  async getUserRanking(continent, difficulty) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.id;
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    // First get the user's best score
    const userBestScore = await this.getUserBestScore(continent, difficulty);
    if (!userBestScore) {
      return { rank: -1, totalUsers: 0 }; // -1 means no score
    }

    // Count how many scores are better than the user's score
    const { count: betterScoresCount, error: countError } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('continent', continent)
      .eq('difficulty', difficulty)
      .or(`moves.lt.${userBestScore.moves},and(moves.eq.${userBestScore.moves},time.lt.${userBestScore.time})`);

    if (countError) {
      console.error('Error counting better scores:', countError.message);
      throw new Error(countError.message);
    }

    // Get total number of players for this continent/difficulty
    const { count: totalPlayers, error: totalError } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('continent', continent)
      .eq('difficulty', difficulty);

    if (totalError) {
      console.error('Error counting total players:', totalError.message);
      throw new Error(totalError.message);
    }

    return {
      rank: betterScoresCount + 1,
      totalUsers: totalPlayers
    };
  }

  /**
   * Check if a score is a personal best for the user
   */
  async isPersonalBest(userId, newScore) {
    if (!userId) {
      return false;
    }

    const currentBest = await this.getUserBestScore(newScore.continent, newScore.difficulty);
    
    if (!currentBest) {
      return true; // No previous score, so this is a best
    }

    // Compare moves first, then time
    if (newScore.moves < currentBest.moves) {
      return true;
    } else if (newScore.moves === currentBest.moves && 
               this.timeToSeconds(newScore.time) < this.timeToSeconds(currentBest.time)) {
      return true;
    }

    return false;
  }

  /**
   * Convert time string (MM:SS) to seconds for comparison
   */
  timeToSeconds(timeStr) {
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  }
}

// Export singleton instance
const scoreService = new ScoreService();
export default scoreService;

// Also export for direct instantiation if needed
export { ScoreService };