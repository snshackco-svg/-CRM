-- Add Notta URL and AI Summary to meetings table
-- Migration: 0012_add_notta_and_ai_summary_to_meetings
-- Purpose: Support Notta integration and AI-powered meeting summaries for appointment preparation

-- Add Notta URL field
ALTER TABLE meetings ADD COLUMN notta_url TEXT;

-- Add AI Summary field (JSON structure)
-- Structure: {
--   "key_topics": ["topic1", "topic2"],
--   "action_items": [{"task": "...", "status": "completed|pending", "assignee": "..."}],
--   "next_meeting_points": ["point1", "point2"],
--   "client_concerns": ["concern1", "concern2"],
--   "decision_makers": ["name1", "name2"],
--   "budget_discussion": "...",
--   "timeline_discussion": "...",
--   "generated_at": "2024-06-15T10:00:00Z"
-- }
ALTER TABLE meetings ADD COLUMN ai_summary TEXT;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_meetings_notta_url ON meetings(notta_url);
