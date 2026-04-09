-- Run this in Supabase SQL Editor to fix the avatar_url column type
-- This allows it to store longer URLs (TEXT has no length limit)
ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;
