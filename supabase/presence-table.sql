-- Create presence table for real-time online users tracking
CREATE TABLE presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_id TEXT UNIQUE, -- Unique identifier for browser session
  last_seen TIMESTAMP DEFAULT NOW(),
  is_online BOOLEAN DEFAULT TRUE
);

-- Create indexes for performance optimization
CREATE INDEX idx_presence_user_id ON presence (user_id);
CREATE INDEX idx_presence_session_id ON presence (session_id);
CREATE INDEX idx_presence_is_online ON presence (is_online);
CREATE INDEX idx_presence_last_seen ON presence (last_seen);