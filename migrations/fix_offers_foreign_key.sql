-- Fix foreign key constraints for listings table relationships
-- This migration adds ON DELETE CASCADE to both offers and chats foreign key constraints

-- 1. Fix the offers table constraint
-- First, drop the existing constraint
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_listing_id_fkey;

-- Then recreate it with ON DELETE CASCADE
ALTER TABLE offers
  ADD CONSTRAINT offers_listing_id_fkey
  FOREIGN KEY (listing_id)
  REFERENCES listings(id)
  ON DELETE CASCADE;

-- 2. Fix the chats table constraint
-- First, drop the existing constraint
ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_listing_id_fkey;

-- Then recreate it with ON DELETE CASCADE
ALTER TABLE chats
  ADD CONSTRAINT chats_listing_id_fkey
  FOREIGN KEY (listing_id)
  REFERENCES listings(id)
  ON DELETE CASCADE;

-- This will automatically delete related offers and chats when a listing is deleted
