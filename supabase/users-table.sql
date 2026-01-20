-- Create users table for Flags of the World safely
-- This script is idempotent and can be run multiple times without error

-- 1. Create table if it doesn't exist
-- The id should match the auth.users id to properly link profiles
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE, -- Made optional since it's handled by trigger
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  player_country TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create a trigger function to automatically create user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS TRIGGER
 LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$;

-- 3. Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Create a trigger function to automatically update user profiles when auth info changes
CREATE OR REPLACE FUNCTION public.handle_updated_user()
 RETURNS TRIGGER
 LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.users
  SET
    email = NEW.email,
    username = COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- 5. Create the update trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_user();

-- 6. Create indexes safely
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- 7. Force a refresh of the schema cache to ensure the API sees new columns/tables immediately
NOTIFY pgrst, 'reload config';