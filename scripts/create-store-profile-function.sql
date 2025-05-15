-- SQL function to reliably store a user profile with all fields
-- This ensures atomic updates to prevent partial profile data

CREATE OR REPLACE FUNCTION store_user_profile(
  user_id UUID,
  user_full_name TEXT,
  user_bio TEXT,
  user_avatar_url TEXT,
  user_is_onboarded BOOLEAN DEFAULT true
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_data JSONB;
BEGIN
  -- Update the users table with all provided fields
  UPDATE users
  SET 
    full_name = user_full_name,
    bio = user_bio,
    avatar_url = user_avatar_url,
    is_onboarded = user_is_onboarded,
    updated_at = NOW()
  WHERE id = user_id
  RETURNING to_jsonb(users.*) INTO profile_data;
  
  -- If no rows were updated, the user doesn't exist
  IF profile_data IS NULL THEN
    RAISE EXCEPTION 'User with ID % not found', user_id;
  END IF;
  
  RETURN profile_data;
END;
$$;
