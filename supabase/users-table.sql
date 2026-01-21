-- Create users table for Flags of the World
-- This table stores user profile information linked to Supabase auth

-- 1. Create the users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Links to Supabase auth user
  email TEXT UNIQUE NOT NULL, -- User's email from auth
  full_name TEXT, -- User's full name
  avatar_url TEXT, -- URL to user's avatar/image
  player_country TEXT, -- User's selected country
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 3. Create trigger function to automatically create user profiles when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4. Create trigger function to update user profiles when auth info changes
CREATE OR REPLACE FUNCTION public.handle_updated_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id)
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- 5. Create triggers on auth.users table (drop and recreate to ensure proper function)
DO $$
BEGIN
  -- Drop existing triggers if they exist
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

  -- Create the triggers
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_user();
END $$;

-- 6. Grant permissions for the trigger functions
GRANT EXECUTE ON FUNCTION public.handle_new_user TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_updated_user TO service_role;

-- 7. Refresh schema cache
NOTIFY pgrst, 'reload config';