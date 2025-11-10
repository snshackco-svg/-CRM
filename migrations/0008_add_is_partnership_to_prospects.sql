-- Add is_partnership field to prospects table for kanban board filtering
-- Migration: 0025_add_is_partnership_to_prospects

-- Add is_partnership column (0=customer, 1=partnership)
ALTER TABLE prospects ADD COLUMN is_partnership INTEGER NOT NULL DEFAULT 0 CHECK(is_partnership IN (0, 1));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_prospects_is_partnership ON prospects(is_partnership);
