-- Create prospect_tags table for flexible tagging
CREATE TABLE IF NOT EXISTS prospect_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prospect_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
  UNIQUE(prospect_id, tag)
);

-- Index for faster tag lookups
CREATE INDEX IF NOT EXISTS idx_prospect_tags_prospect_id ON prospect_tags(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_tags_tag ON prospect_tags(tag);
