-- Nurturing CRM Extension - Add 3-layer data model for relationship-focused sales
-- Migration: 0018_add_nurturing_crm_tables
-- Purpose: Add MasterContacts, Deals, and Interactions tables for nurturing-focused CRM

-- =============================================================================
-- Layer 1: Master Contacts (マスター連絡先)
-- =============================================================================
-- Purpose: Store fundamental contact information separate from sales opportunities
-- This allows tracking people/companies independently of active deals

CREATE TABLE IF NOT EXISTS master_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Basic Information
  contact_type TEXT NOT NULL DEFAULT 'person' CHECK(contact_type IN ('person', 'company')),
  name TEXT NOT NULL,
  company_name TEXT,
  position TEXT,
  department TEXT,
  
  -- Contact Details
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address TEXT,
  
  -- Social & Web Presence
  linkedin_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  website_url TEXT,
  
  -- Business Context
  industry TEXT,
  company_size TEXT,
  annual_revenue TEXT,
  
  -- Relationship Management
  relationship_strength TEXT DEFAULT 'cold' CHECK(relationship_strength IN ('cold', 'warm', 'hot')),
  contact_source TEXT,
  tags TEXT, -- JSON array: ["tag1", "tag2"]
  
  -- Scoring & Classification
  lead_score INTEGER DEFAULT 0 CHECK(lead_score >= 0 AND lead_score <= 100),
  engagement_score INTEGER DEFAULT 0 CHECK(engagement_score >= 0 AND engagement_score <= 100),
  
  -- Notes & Metadata
  notes TEXT,
  custom_fields TEXT, -- JSON object for flexible data
  
  -- Ownership & Timestamps
  owner_id INTEGER NOT NULL, -- Sales person responsible
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_contact_date DATETIME,
  
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =============================================================================
-- Layer 2: Deals (案件・取引)
-- =============================================================================
-- Purpose: Track specific sales opportunities linked to master contacts
-- Implements 8-stage nurturing pipeline

CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Deal Identification
  deal_name TEXT NOT NULL,
  deal_number TEXT UNIQUE, -- Auto-generated deal ID (e.g., DEAL-2024-001)
  
  -- Relationships
  master_contact_id INTEGER NOT NULL, -- Primary contact
  prospect_id INTEGER, -- Link to legacy prospects table for backward compatibility
  company_name TEXT,
  
  -- 8-Stage Pipeline (ナーチャリング特化)
  stage TEXT NOT NULL DEFAULT 'prospect' CHECK(stage IN (
    'prospect',          -- 見込み: Initial lead
    'nurturing',         -- 関係構築: Building relationship
    'scheduling',        -- 日程調整中: Scheduling meeting
    'meeting_held',      -- 商談実施: Meeting completed
    'proposal',          -- 提案: Proposal sent
    'won',               -- 成約: Deal closed successfully
    'payment_pending',   -- 入金待ち: Waiting for payment
    'paid'               -- 入金済み: Payment received
  )),
  
  -- Deal Value & Timeline
  estimated_value INTEGER DEFAULT 0,
  actual_value INTEGER,
  currency TEXT DEFAULT 'JPY',
  expected_close_date DATE,
  actual_close_date DATE,
  
  -- Priority & Status
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  deal_status TEXT DEFAULT 'active' CHECK(deal_status IN ('active', 'won', 'lost', 'on_hold')),
  loss_reason TEXT, -- Reason if deal_status = 'lost'
  
  -- Scoring & Health
  deal_score INTEGER DEFAULT 0 CHECK(deal_score >= 0 AND deal_score <= 100),
  health_status TEXT DEFAULT 'healthy' CHECK(health_status IN ('at_risk', 'needs_attention', 'healthy', 'excellent')),
  
  -- SLA & Response Management
  sla_status TEXT DEFAULT 'on_time' CHECK(sla_status IN ('on_time', 'approaching_deadline', 'overdue')),
  last_response_date DATETIME,
  next_action_date DATE,
  next_action_description TEXT,
  
  -- Metrics
  days_in_current_stage INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0, -- Count of interactions
  last_interaction_date DATETIME,
  
  -- Notes & Metadata
  notes TEXT,
  custom_fields TEXT, -- JSON object
  
  -- Ownership & Timestamps
  owner_id INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (master_contact_id) REFERENCES master_contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =============================================================================
-- Layer 3: Interactions (接点ログ)
-- =============================================================================
-- Purpose: Record all touchpoints with contacts (calls, emails, meetings, social)
-- Enables relationship building visualization

CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Relationships
  master_contact_id INTEGER NOT NULL,
  deal_id INTEGER, -- Optional: Link to specific deal
  
  -- Interaction Type
  interaction_type TEXT NOT NULL CHECK(interaction_type IN (
    'call',           -- 電話
    'email',          -- メール
    'meeting',        -- 対面会議
    'video_call',     -- ビデオ通話
    'line',           -- LINE
    'instagram_dm',   -- Instagram DM
    'tiktok_dm',      -- TikTok DM
    'facebook_dm',    -- Facebook DM
    'twitter_dm',     -- Twitter DM
    'linkedin',       -- LinkedIn
    'sms',            -- SMS
    'other'           -- その他
  )),
  
  -- Interaction Details
  interaction_date DATETIME NOT NULL,
  duration_minutes INTEGER, -- Call/meeting duration
  direction TEXT CHECK(direction IN ('inbound', 'outbound')), -- Who initiated
  
  -- Content
  subject TEXT,
  summary TEXT NOT NULL, -- Brief summary of interaction
  notes TEXT, -- Detailed notes
  outcome TEXT, -- Result/outcome of interaction
  
  -- Sentiment & Quality
  sentiment TEXT CHECK(sentiment IN ('negative', 'neutral', 'positive', 'very_positive')),
  engagement_quality TEXT CHECK(engagement_quality IN ('low', 'medium', 'high')),
  
  -- Follow-up
  next_follow_up_date DATE,
  next_follow_up_action TEXT,
  
  -- Attachments & References
  attachments TEXT, -- JSON array of file URLs
  related_meeting_id INTEGER, -- Link to meetings table if applicable
  
  -- Metadata
  tags TEXT, -- JSON array
  custom_fields TEXT, -- JSON object
  
  -- Ownership & Timestamps
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (master_contact_id) REFERENCES master_contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (related_meeting_id) REFERENCES meetings(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =============================================================================
-- Deal Stage History (ステージ履歴)
-- =============================================================================
-- Purpose: Track stage transitions for analytics and reporting

CREATE TABLE IF NOT EXISTS deal_stage_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id INTEGER NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by INTEGER NOT NULL,
  change_reason TEXT,
  days_in_previous_stage INTEGER,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- =============================================================================
-- Contact Relationships (連絡先間の関係)
-- =============================================================================
-- Purpose: Track relationships between contacts (who knows whom)

CREATE TABLE IF NOT EXISTS contact_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_a_id INTEGER NOT NULL,
  contact_b_id INTEGER NOT NULL,
  relationship_type TEXT CHECK(relationship_type IN ('colleague', 'friend', 'family', 'business_partner', 'referrer', 'referred', 'other')),
  relationship_strength TEXT CHECK(relationship_strength IN ('weak', 'moderate', 'strong')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (contact_a_id) REFERENCES master_contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_b_id) REFERENCES master_contacts(id) ON DELETE CASCADE,
  UNIQUE(contact_a_id, contact_b_id)
);

-- =============================================================================
-- Backward Compatibility: Add master_contact_id to prospects
-- =============================================================================
-- Link legacy prospects table to new master_contacts

ALTER TABLE prospects ADD COLUMN master_contact_id INTEGER REFERENCES master_contacts(id) ON DELETE SET NULL;

-- =============================================================================
-- Performance Indexes
-- =============================================================================

-- Master Contacts Indexes
CREATE INDEX IF NOT EXISTS idx_master_contacts_owner_id ON master_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_master_contacts_contact_type ON master_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_master_contacts_relationship_strength ON master_contacts(relationship_strength);
CREATE INDEX IF NOT EXISTS idx_master_contacts_lead_score ON master_contacts(lead_score);
CREATE INDEX IF NOT EXISTS idx_master_contacts_email ON master_contacts(email);
CREATE INDEX IF NOT EXISTS idx_master_contacts_company_name ON master_contacts(company_name);
CREATE INDEX IF NOT EXISTS idx_master_contacts_last_contact_date ON master_contacts(last_contact_date);

-- Deals Indexes
CREATE INDEX IF NOT EXISTS idx_deals_master_contact_id ON deals(master_contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_prospect_id ON deals(prospect_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_deal_status ON deals(deal_status);
CREATE INDEX IF NOT EXISTS idx_deals_priority ON deals(priority);
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_deal_score ON deals(deal_score);
CREATE INDEX IF NOT EXISTS idx_deals_sla_status ON deals(sla_status);
CREATE INDEX IF NOT EXISTS idx_deals_next_action_date ON deals(next_action_date);

-- Interactions Indexes
CREATE INDEX IF NOT EXISTS idx_interactions_master_contact_id ON interactions(master_contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_deal_id ON interactions(deal_id);
CREATE INDEX IF NOT EXISTS idx_interactions_interaction_type ON interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_interaction_date ON interactions(interaction_date);
CREATE INDEX IF NOT EXISTS idx_interactions_created_by ON interactions(created_by);
CREATE INDEX IF NOT EXISTS idx_interactions_next_follow_up_date ON interactions(next_follow_up_date);

-- Deal Stage History Indexes
CREATE INDEX IF NOT EXISTS idx_deal_stage_history_deal_id ON deal_stage_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_stage_history_changed_at ON deal_stage_history(changed_at);

-- Contact Relationships Indexes
CREATE INDEX IF NOT EXISTS idx_contact_relationships_contact_a ON contact_relationships(contact_a_id);
CREATE INDEX IF NOT EXISTS idx_contact_relationships_contact_b ON contact_relationships(contact_b_id);

-- Prospects backward compatibility index
CREATE INDEX IF NOT EXISTS idx_prospects_master_contact_id ON prospects(master_contact_id);
