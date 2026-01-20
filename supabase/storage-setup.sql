-- Supabase Storage Setup for Avatars
-- This script creates a storage bucket for user avatars and sets appropriate policies

-- Note: Storage buckets are typically created through the Supabase dashboard
-- This SQL is for reference and documentation purposes

-- To create the bucket, you would use the Supabase dashboard or the CLI:
-- supabase storage create --name=avatars --public=true

-- However, if you need to create it via SQL (which is limited), you would do:

-- Enable the storage extension if not already enabled
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create policies for the avatars bucket after it's created in the dashboard
-- These would be run after creating the bucket through the dashboard:

-- After creating the bucket in the dashboard, you can set up policies like this:

-- Enable public read access to the avatars bucket
-- NOTE: This is pseudocode as storage bucket creation via SQL is limited in Supabase
-- Actual bucket creation should be done via dashboard or CLI

-- Example policy once bucket exists (this would be configured in the dashboard):
/*
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update their own avatars
CREATE POLICY "Allow authenticated users to update own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (auth.uid()::text = owner_id);

-- Allow public read access to avatars
CREATE POLICY "Allow public read access to avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');
*/