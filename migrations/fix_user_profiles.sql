-- Fix User Profiles Migration
-- This script consolidates user data between the users and profiles tables

-- 1. First, ensure the users table has all necessary columns
ALTER TABLE IF EXISTS "public"."users" 
  ADD COLUMN IF NOT EXISTS "bio" TEXT,
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "location" JSONB;

-- 2. Create a function to ensure users have email values
CREATE OR REPLACE FUNCTION ensure_user_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RAISE EXCEPTION 'email cannot be null';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a trigger to enforce email requirement
DROP TRIGGER IF EXISTS ensure_user_email_trigger ON "public"."users";
CREATE TRIGGER ensure_user_email_trigger
BEFORE INSERT OR UPDATE ON "public"."users"
FOR EACH ROW
EXECUTE FUNCTION ensure_user_email();

-- 4. Migrate data from profiles to users (if needed)
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  -- Check if profiles table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    -- Migrate data from profiles to users
    FOR profile_record IN SELECT * FROM "public"."profiles" LOOP
      UPDATE "public"."users"
      SET 
        "name" = COALESCE(profile_record.name, "users"."full_name"),
        "bio" = profile_record.bio,
        "avatar_url" = COALESCE(profile_record.avatar_url, "users"."avatar_url"),
        "updated_at" = NOW()
      WHERE "users"."id" = profile_record.id;
    END LOOP;
  END IF;
END $$;

-- 5. Create a view that combines user and profile data (for backward compatibility)
CREATE OR REPLACE VIEW "public"."user_profiles" AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.name,
  u.bio,
  u.avatar_url,
  u.location,
  u.created_at,
  u.updated_at
FROM "public"."users" u;

-- 6. Create a function to handle automatic user creation from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at, location)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    NEW.created_at,
    '{"city": "", "zip_code": "", "country": "US"}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a trigger to automatically create user records
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Create a function to handle profile inserts
CREATE OR REPLACE FUNCTION handle_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user exists
  IF EXISTS (SELECT 1 FROM "public"."users" WHERE id = NEW.id) THEN
    -- Update existing user
    UPDATE "public"."users"
    SET 
      "name" = NEW.name,
      "bio" = NEW.bio,
      "avatar_url" = COALESCE(NEW.avatar_url, "users"."avatar_url"),
      "updated_at" = NEW.updated_at
    WHERE "users"."id" = NEW.id;
  ELSE
    -- Cannot insert profile without user
    RAISE EXCEPTION 'Cannot create profile for non-existent user: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to ensure profile has corresponding user
CREATE OR REPLACE FUNCTION ensure_profile_has_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM "public"."users" WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'Cannot create profile for non-existent user: %', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. For existing profiles table, create a BEFORE INSERT trigger
DROP TRIGGER IF EXISTS before_profile_insert_trigger ON "public"."profiles";
CREATE TRIGGER before_profile_insert_trigger
BEFORE INSERT ON "public"."profiles"
FOR EACH ROW
EXECUTE FUNCTION ensure_profile_has_user();
