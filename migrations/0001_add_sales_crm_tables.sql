-- Sales CRM Extension - Add tables for sales activities, meetings, and networking
-- Migration: 0006_add_sales_crm_tables

-- Prospects table (見込み客・商談先)
CREATE TABLE IF NOT EXISTS prospects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  company_url TEXT,
  industry TEXT,
  company_size TEXT,
  contact_name TEXT,
  contact_position TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  sales_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'researching', 'contacted', 'meeting_scheduled', 'negotiating', 'won', 'lost')),
  source TEXT,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_value INTEGER,
  expected_close_date DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_id) REFERENCES users(id)
);

-- Pre-meeting Research (事前リサーチ)
CREATE TABLE IF NOT EXISTS pre_meeting_research (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prospect_id INTEGER NOT NULL,
  business_overview TEXT,
  key_personnel TEXT,
  recent_news TEXT,
  pain_points TEXT,
  opportunities TEXT,
  competitor_analysis TEXT,
  suggested_approach TEXT,
  research_sources TEXT,
  ai_generated INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
);

-- Meetings table (商談・会議記録)
CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prospect_id INTEGER NOT NULL,
  meeting_date DATETIME NOT NULL,
  meeting_type TEXT NOT NULL CHECK(meeting_type IN ('initial', 'follow_up', 'presentation', 'negotiation', 'closing', 'other')),
  attendees TEXT NOT NULL,
  location TEXT,
  duration_minutes INTEGER,
  agenda TEXT,
  minutes TEXT,
  good_points TEXT,
  improvement_points TEXT,
  next_actions TEXT,
  meeting_outcome TEXT,
  sales_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_id) REFERENCES users(id)
);

-- Meeting ToDos (商談後のタスク)
CREATE TABLE IF NOT EXISTS meeting_todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  prospect_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id INTEGER,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id)
);

-- Email Templates (自動生成メール)
CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER,
  prospect_id INTEGER NOT NULL,
  template_type TEXT NOT NULL CHECK(template_type IN ('thank_you_client', 'thank_you_referrer', 'introduction', 'follow_up', 'pm_report')),
  recipient_type TEXT NOT NULL CHECK(recipient_type IN ('client', 'referrer', 'prospect', 'pm', 'other')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  ai_generated INTEGER DEFAULT 1,
  sent INTEGER DEFAULT 0,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL,
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
);

-- Networking Connections (人脈管理)
CREATE TABLE IF NOT EXISTS networking_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_name TEXT NOT NULL,
  company TEXT,
  position TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  industry TEXT,
  expertise TEXT,
  relationship_strength TEXT CHECK(relationship_strength IN ('weak', 'moderate', 'strong')),
  last_contact_date DATE,
  notes TEXT,
  tags TEXT,
  sales_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_id) REFERENCES users(id)
);

-- Connection Matches (人脈マッチング提案)
CREATE TABLE IF NOT EXISTS connection_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prospect_id INTEGER NOT NULL,
  connection_id INTEGER NOT NULL,
  match_reason TEXT NOT NULL,
  match_score REAL DEFAULT 0.5,
  introduction_text TEXT,
  status TEXT DEFAULT 'suggested' CHECK(status IN ('suggested', 'approved', 'rejected', 'introduced', 'completed')),
  ai_generated INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
  FOREIGN KEY (connection_id) REFERENCES networking_connections(id) ON DELETE CASCADE
);

-- PM Reports (PM向け報告書)
CREATE TABLE IF NOT EXISTS pm_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  prospect_id INTEGER NOT NULL,
  report_date DATE NOT NULL,
  summary TEXT NOT NULL,
  key_points TEXT,
  challenges TEXT,
  next_steps TEXT,
  support_needed TEXT,
  ai_generated INTEGER DEFAULT 1,
  sent_to_pm INTEGER DEFAULT 0,
  sent_at DATETIME,
  sales_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prospects_sales_id ON prospects(sales_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_priority ON prospects(priority);
CREATE INDEX IF NOT EXISTS idx_pre_meeting_research_prospect_id ON pre_meeting_research(prospect_id);
CREATE INDEX IF NOT EXISTS idx_meetings_prospect_id ON meetings(prospect_id);
CREATE INDEX IF NOT EXISTS idx_meetings_sales_id ON meetings(sales_id);
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_todos_meeting_id ON meeting_todos(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_todos_prospect_id ON meeting_todos(prospect_id);
CREATE INDEX IF NOT EXISTS idx_meeting_todos_assignee_id ON meeting_todos(assignee_id);
CREATE INDEX IF NOT EXISTS idx_meeting_todos_status ON meeting_todos(status);
CREATE INDEX IF NOT EXISTS idx_meeting_todos_due_date ON meeting_todos(due_date);
CREATE INDEX IF NOT EXISTS idx_email_templates_meeting_id ON email_templates(meeting_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_prospect_id ON email_templates(prospect_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_template_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_networking_connections_sales_id ON networking_connections(sales_id);
CREATE INDEX IF NOT EXISTS idx_connection_matches_prospect_id ON connection_matches(prospect_id);
CREATE INDEX IF NOT EXISTS idx_connection_matches_connection_id ON connection_matches(connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_matches_status ON connection_matches(status);
CREATE INDEX IF NOT EXISTS idx_pm_reports_meeting_id ON pm_reports(meeting_id);
CREATE INDEX IF NOT EXISTS idx_pm_reports_prospect_id ON pm_reports(prospect_id);
CREATE INDEX IF NOT EXISTS idx_pm_reports_sales_id ON pm_reports(sales_id);
