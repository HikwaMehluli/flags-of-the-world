-- Row Level Security (RLS) Policies for Flags of the World
-- This script sets up security policies for all tables

-- 1. Enable RLS on all tables (only if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'users'
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'scores'
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'presence'
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE presence ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 2. CREATE policies (with conditional creation to avoid conflicts)

-- Users table policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON users
      FOR SELECT TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON users
      FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can delete own profile') THEN
    CREATE POLICY "Users can delete own profile" ON users
      FOR DELETE TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Scores table policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scores' AND policyname = 'Users can view all scores') THEN
    CREATE POLICY "Users can view all scores" ON scores
      FOR SELECT TO authenticated, anon
      USING (true);  -- Allow viewing all scores
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scores' AND policyname = 'Users can insert own scores') THEN
    CREATE POLICY "Users can insert own scores" ON scores
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scores' AND policyname = 'Users can update own scores') THEN
    CREATE POLICY "Users can update own scores" ON scores
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scores' AND policyname = 'Users can delete own scores') THEN
    CREATE POLICY "Users can delete own scores" ON scores
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scores' AND policyname = 'Anonymous users can view scores') THEN
    CREATE POLICY "Anonymous users can view scores" ON scores
      FOR SELECT TO anon
      USING (true);
  END IF;
END $$;

-- Presence table policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'presence' AND policyname = 'Users can view presence') THEN
    CREATE POLICY "Users can view presence" ON presence
      FOR SELECT TO authenticated, anon
      USING (true);  -- Allow viewing presence data
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'presence' AND policyname = 'Users can insert own presence') THEN
    CREATE POLICY "Users can insert own presence" ON presence
      FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = user_id OR
        (auth.uid() IS NOT NULL AND user_id IS NULL)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'presence' AND policyname = 'Users can update own presence') THEN
    CREATE POLICY "Users can update own presence" ON presence
      FOR UPDATE TO authenticated
      USING (
        auth.uid() = user_id OR
        (auth.uid() IS NOT NULL AND user_id IS NULL AND auth.uid() = (SELECT user_id FROM presence WHERE session_id = current_setting('request.headers', true)::json->>'x-session-id'))
      )
      WITH CHECK (
        auth.uid() = user_id OR
        (auth.uid() IS NOT NULL AND user_id IS NULL AND auth.uid() = (SELECT user_id FROM presence WHERE session_id = current_setting('request.headers', true)::json->>'x-session-id'))
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'presence' AND policyname = 'Users can delete own presence') THEN
    CREATE POLICY "Users can delete own presence" ON presence
      FOR DELETE TO authenticated
      USING (
        auth.uid() = user_id OR
        (auth.uid() IS NOT NULL AND user_id IS NULL AND auth.uid() = (SELECT user_id FROM presence WHERE session_id = current_setting('request.headers', true)::json->>'x-session-id'))
      );
  END IF;
END $$;

-- 3. Create a function to validate score reasonableness to prevent cheating
DO $$
BEGIN
  -- Drop the function if it exists with different parameter names
  DROP FUNCTION IF EXISTS validate_score_reasonableness(integer, text, text);

  -- Create the function with the correct parameter names
  CREATE FUNCTION validate_score_reasonableness(p_moves INT, p_time TEXT, p_difficulty TEXT)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  AS $func$
  DECLARE
      minutes INT;
      seconds INT;
      total_seconds INT;
  BEGIN
      -- Parse time string (MM:SS format)
      SELECT split_part(p_time, ':', 1)::INT INTO minutes;
      SELECT split_part(p_time, ':', 2)::INT INTO seconds;
      total_seconds := minutes * 60 + seconds;

      -- Set minimum reasonable thresholds based on difficulty
      CASE p_difficulty
          WHEN 'easy' THEN
              -- Minimum reasonable: 4 moves (all matches on first try), 20 seconds
              RETURN p_moves >= 4 AND total_seconds >= 20;
          WHEN 'medium' THEN
              -- Minimum reasonable: 6 moves, 30 seconds
              RETURN p_moves >= 6 AND total_seconds >= 30;
          WHEN 'hard' THEN
              -- Minimum reasonable: 8 moves, 45 seconds
              RETURN p_moves >= 8 AND total_seconds >= 45;
          ELSE
              -- Default to medium if invalid difficulty
              RETURN p_moves >= 6 AND total_seconds >= 30;
      END CASE;
  END;
  $func$;
END $$;

-- 4. Create trigger function to validate scores before insertion
CREATE OR REPLACE FUNCTION validate_score_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- 5. Create trigger function to validate scores before update
CREATE OR REPLACE FUNCTION validate_score_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- 6. Create function to rate limit score submissions
CREATE OR REPLACE FUNCTION check_rate_limit()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
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
$$;

-- 7. Create trigger to enforce rate limiting
CREATE OR REPLACE FUNCTION enforce_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT check_rate_limit() THEN
        RAISE EXCEPTION 'Rate limit exceeded: maximum 5 scores per hour';
    END IF;

    RETURN NEW;
END;
$$;

-- 8. Apply triggers to the scores table (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'validate_score_before_insert' AND tgrelid = 'scores'::regclass) THEN
    CREATE TRIGGER validate_score_before_insert
      BEFORE INSERT ON scores
      FOR EACH ROW
      EXECUTE FUNCTION validate_score_insert();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'validate_score_before_update' AND tgrelid = 'scores'::regclass) THEN
    CREATE TRIGGER validate_score_before_update
      BEFORE UPDATE ON scores
      FOR EACH ROW
      EXECUTE FUNCTION validate_score_update();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'rate_limit_check_before_insert' AND tgrelid = 'scores'::regclass) THEN
    CREATE TRIGGER rate_limit_check_before_insert
      BEFORE INSERT ON scores
      FOR EACH ROW
      EXECUTE FUNCTION enforce_rate_limit();
  END IF;
END $$;

-- 9. Grant permissions for functions
DO $$
BEGIN
  -- Grant permissions for functions, ignoring errors if already granted
  BEGIN
    GRANT EXECUTE ON FUNCTION validate_score_reasonableness(integer, text, text) TO authenticated, service_role;
  EXCEPTION
    WHEN undefined_function THEN
      -- Function doesn't exist yet, that's OK
      NULL;
  END;

  BEGIN
    GRANT EXECUTE ON FUNCTION validate_score_insert() TO authenticated, service_role;
  EXCEPTION
    WHEN undefined_function THEN
      -- Function doesn't exist yet, that's OK
      NULL;
  END;

  BEGIN
    GRANT EXECUTE ON FUNCTION validate_score_update() TO authenticated, service_role;
  EXCEPTION
    WHEN undefined_function THEN
      -- Function doesn't exist yet, that's OK
      NULL;
  END;

  BEGIN
    GRANT EXECUTE ON FUNCTION check_rate_limit() TO authenticated, service_role;
  EXCEPTION
    WHEN undefined_function THEN
      -- Function doesn't exist yet, that's OK
      NULL;
  END;

  BEGIN
    GRANT EXECUTE ON FUNCTION enforce_rate_limit() TO authenticated, service_role;
  EXCEPTION
    WHEN undefined_function THEN
      -- Function doesn't exist yet, that's OK
      NULL;
  END;

  BEGIN
    GRANT EXECUTE ON FUNCTION gen_random_uuid() TO authenticated, service_role;
  EXCEPTION
    WHEN undefined_function THEN
      -- Function doesn't exist yet, that's OK
      NULL;
  END;
END $$;

-- 10. Grant schema usage and table permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE users TO service_role;
GRANT SELECT, INSERT ON TABLE users TO authenticated;
GRANT ALL ON TABLE scores TO service_role, authenticated;
GRANT ALL ON TABLE presence TO service_role, authenticated;

-- 11. Refresh schema cache
NOTIFY pgrst, 'reload config';