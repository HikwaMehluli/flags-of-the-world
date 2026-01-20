-- Row Level Security (RLS) Policies for Flags of the World

-- Enable RLS on the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only update their own profiles
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create policy: Users can only read their own profiles
CREATE POLICY "Users can read own profile" ON users
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Create policy: Users can only delete their own profiles
CREATE POLICY "Users can delete own profile" ON users
FOR DELETE TO authenticated
USING (auth.uid() = id);

-- Enable RLS on the scores table
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Create policy: Scores are publicly readable
CREATE POLICY "Scores are viewable by everyone" ON scores
FOR SELECT USING (true);

-- Create policy: Only authenticated users can insert scores
CREATE POLICY "Authenticated users can insert scores" ON scores
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can only update their own scores
CREATE POLICY "Users can update own scores" ON scores
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can only delete their own scores
CREATE POLICY "Users can delete own scores" ON scores
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Enable RLS on the presence table
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to view online users
CREATE POLICY "Anyone can view presence"
ON presence FOR SELECT
USING (true);

-- Policy to allow authenticated users to insert/update their own presence
CREATE POLICY "Users can update their own presence"
ON presence FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence (last_seen);
CREATE INDEX IF NOT EXISTS idx_presence_is_online ON presence (is_online);

-- Additional security: Limit access to auth table for regular users
-- Only service role should have access to sensitive auth information
REVOKE ALL ON auth.users FROM PUBLIC;
REVOKE ALL ON auth.identities FROM PUBLIC;

-- Create a function to validate score reasonableness
CREATE OR REPLACE FUNCTION validate_score_reasonableness(moves INT, time_val TEXT, difficulty TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    minutes INT;
    seconds INT;
    total_seconds INT;
BEGIN
    -- Parse time string (MM:SS format)
    SELECT split_part(time_val, ':', 1)::INT INTO minutes;
    SELECT split_part(time_val, ':', 2)::INT INTO seconds;
    total_seconds := minutes * 60 + seconds;

    -- Set minimum reasonable thresholds based on difficulty
    CASE difficulty
        WHEN 'easy' THEN
            -- Minimum reasonable: 4 moves (all matches on first try), 20 seconds
            RETURN moves >= 4 AND total_seconds >= 20;
        WHEN 'medium' THEN
            -- Minimum reasonable: 6 moves, 30 seconds
            RETURN moves >= 6 AND total_seconds >= 30;
        WHEN 'hard' THEN
            -- Minimum reasonable: 8 moves, 45 seconds
            RETURN moves >= 8 AND total_seconds >= 45;
        ELSE
            -- Default to medium if invalid difficulty
            RETURN moves >= 6 AND total_seconds >= 30;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to validate scores before insertion
CREATE OR REPLACE FUNCTION validate_score_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the score is reasonable to prevent cheating
    IF NOT validate_score_reasonableness(NEW.moves, NEW.time, NEW.difficulty) THEN
        RAISE EXCEPTION 'Score is not reasonable - possible cheating detected';
    END IF;

    -- Ensure the user_id matches the authenticated user
    IF NEW.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot insert score for another user';
    END IF;

    -- Sanitize inputs
    NEW.name := trim(NEW.name);
    NEW.region := trim(NEW.region);
    NEW.player_country := trim(NEW.player_country);
    
    -- Limit name length
    IF LENGTH(NEW.name) > 50 THEN
        NEW.name := SUBSTRING(NEW.name, 1, 50);
    END IF;
    
    -- Limit country length
    IF NEW.player_country IS NOT NULL AND LENGTH(NEW.player_country) > 100 THEN
        NEW.player_country := SUBSTRING(NEW.player_country, 1, 100);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate scores before insertion
CREATE TRIGGER validate_score_before_insert
    BEFORE INSERT ON scores
    FOR EACH ROW
    EXECUTE FUNCTION validate_score_insert();

-- Create a trigger function to validate scores before update
CREATE OR REPLACE FUNCTION validate_score_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the score is reasonable to prevent cheating
    IF NOT validate_score_reasonableness(NEW.moves, NEW.time, NEW.difficulty) THEN
        RAISE EXCEPTION 'Score is not reasonable - possible cheating detected';
    END IF;

    -- Ensure the user_id matches the authenticated user
    IF NEW.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot update score for another user';
    END IF;

    -- Sanitize inputs
    NEW.name := trim(NEW.name);
    NEW.region := trim(NEW.region);
    NEW.player_country := trim(NEW.player_country);
    
    -- Limit name length
    IF LENGTH(NEW.name) > 50 THEN
        NEW.name := SUBSTRING(NEW.name, 1, 50);
    END IF;
    
    -- Limit country length
    IF NEW.player_country IS NOT NULL AND LENGTH(NEW.player_country) > 100 THEN
        NEW.player_country := SUBSTRING(NEW.player_country, 1, 100);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate scores before update
CREATE TRIGGER validate_score_before_update
    BEFORE UPDATE ON scores
    FOR EACH ROW
    EXECUTE FUNCTION validate_score_update();

-- Create a function to rate limit score submissions
CREATE OR REPLACE FUNCTION check_rate_limit()
RETURNS BOOLEAN AS $$
DECLARE
    score_count INT;
BEGIN
    -- Check if user has submitted more than 5 scores in the last hour
    SELECT COUNT(*) INTO score_count
    FROM scores
    WHERE user_id = auth.uid()
      AND created_at > NOW() - INTERVAL '1 hour';
    
    RETURN score_count < 5;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to enforce rate limiting
CREATE OR REPLACE FUNCTION enforce_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT check_rate_limit() THEN
        RAISE EXCEPTION 'Rate limit exceeded: maximum 5 scores per hour';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply rate limiting to score insertion
CREATE TRIGGER rate_limit_check_before_insert
    BEFORE INSERT ON scores
    FOR EACH ROW
    EXECUTE FUNCTION enforce_rate_limit();