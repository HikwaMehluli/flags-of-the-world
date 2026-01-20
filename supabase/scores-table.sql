-- Create scores table for Flags of the World
-- This table stores game scores with user information and game details

-- 1. Create the scores table
CREATE TABLE IF NOT EXISTS scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Links to user who scored
  name TEXT NOT NULL, -- Player's display name (may differ from auth name)
  moves INTEGER NOT NULL, -- Number of moves taken to complete the game
  time TEXT NOT NULL, -- Time taken to complete the game (formatted as MM:SS)
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')), -- Game difficulty level
  region TEXT NOT NULL, -- Specific region played (e.g., "africa - southern")
  player_country TEXT, -- Country selected by player (optional)
  continent TEXT NOT NULL CHECK (continent IN ('africa', 'america', 'asia', 'europe')), -- Continent played
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- When the score was recorded
);

-- 2. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_scores_continent_difficulty_moves_time ON scores (continent, difficulty, moves ASC, time);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores (user_id);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_region ON scores (region);
CREATE INDEX IF NOT EXISTS idx_scores_difficulty ON scores (difficulty);

-- 3. Refresh schema cache
NOTIFY pgrst, 'reload config';