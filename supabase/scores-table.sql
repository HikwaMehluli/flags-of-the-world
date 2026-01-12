-- Create scores table for Flags of the World
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL, -- Player's display name
  moves INTEGER NOT NULL, -- Number of moves taken
  time TEXT NOT NULL, -- Time taken (formatted as MM:SS)
  difficulty TEXT NOT NULL, -- Game difficulty (easy, medium, hard)
  region TEXT NOT NULL, -- Game region (e.g., "africa - southern")
  player_country TEXT, -- Player's selected country
  continent TEXT NOT NULL, -- Game continent (africa, america, asia, europe)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX idx_scores_continent_difficulty_moves_time ON scores (continent, difficulty, moves, time);
CREATE INDEX idx_scores_user_id ON scores (user_id);
CREATE INDEX idx_scores_created_at ON scores (created_at);