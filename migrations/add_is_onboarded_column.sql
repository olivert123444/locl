-- Migration to add is_onboarded column to users table
-- This column is used to track whether a user has completed the onboarding process

-- Add is_onboarded column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'is_onboarded'
    ) THEN
        ALTER TABLE users
        ADD COLUMN is_onboarded BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
