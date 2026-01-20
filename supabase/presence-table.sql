-- Create presence table for real-time online users tracking
-- This table tracks which users are currently online in the application

-- 1. Create the presence table
CREATE TABLE IF NOT EXISTS presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Links to user (can be NULL for anonymous users)
  session_id TEXT UNIQUE NOT NULL, -- Unique identifier for browser session
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Last time user was active
  is_online BOOLEAN DEFAULT TRUE, -- Whether the user is currently considered online
  ip_address INET, -- IP address of the user (optional)
  user_agent TEXT -- Browser user agent (optional)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_presence_user_id ON presence (user_id);
CREATE INDEX IF NOT EXISTS idx_presence_session_id ON presence (session_id);
CREATE INDEX IF NOT EXISTS idx_presence_is_online ON presence (is_online);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence (last_seen);
CREATE INDEX IF NOT EXISTS idx_presence_user_online ON presence (user_id, is_online);

-- 3. Create a function to update the last_seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$;

-- 4. Create a trigger to automatically update last_seen on row updates (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_presence_last_seen'
    AND tgrelid = 'presence'::regclass
  ) THEN
    CREATE TRIGGER update_presence_last_seen
      BEFORE UPDATE ON presence
      FOR EACH ROW
      EXECUTE FUNCTION update_last_seen();
  END IF;
END $$;

-- 5. Grant permissions for the trigger function
GRANT EXECUTE ON FUNCTION update_last_seen TO service_role, authenticated;

-- 6. Refresh schema cache
NOTIFY pgrst, 'reload config';