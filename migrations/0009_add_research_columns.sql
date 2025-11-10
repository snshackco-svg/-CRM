-- Add ai_research and deep_research columns to prospects table
ALTER TABLE prospects ADD COLUMN ai_research TEXT;
ALTER TABLE prospects ADD COLUMN deep_research TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prospects_ai_research ON prospects(id) WHERE ai_research IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_deep_research ON prospects(id) WHERE deep_research IS NOT NULL;
