-- Add deep_research field to prospects table for AI-generated deep analysis
ALTER TABLE prospects ADD COLUMN deep_research TEXT;

-- Create index for efficient querying of prospects with deep research
CREATE INDEX IF NOT EXISTS idx_prospects_deep_research ON prospects(id) WHERE deep_research IS NOT NULL;
