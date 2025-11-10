-- Referrals table for tracking referral sources and rankings
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prospect_id INTEGER NOT NULL,
  referrer_name TEXT NOT NULL,
  referrer_company TEXT,
  referrer_email TEXT,
  referrer_phone TEXT,
  referral_date DATE NOT NULL DEFAULT CURRENT_DATE,
  referral_notes TEXT,
  result_status TEXT DEFAULT 'pending' CHECK(result_status IN ('pending', 'contacted', 'meeting_set', 'won', 'lost')),
  commission_amount REAL DEFAULT 0,
  sales_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Weekly Reports table for sales activity tracking
CREATE TABLE IF NOT EXISTS weekly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_id INTEGER NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  -- Activity metrics
  new_prospects_count INTEGER DEFAULT 0,
  meetings_held INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  
  -- Results metrics
  deals_won INTEGER DEFAULT 0,
  deals_lost INTEGER DEFAULT 0,
  revenue_generated REAL DEFAULT 0,
  
  -- Key activities summary
  key_achievements TEXT,
  challenges_faced TEXT,
  next_week_plan TEXT,
  
  -- Submission
  submitted_at DATETIME,
  approved_by INTEGER,
  approved_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (sales_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_prospect_id ON referrals(prospect_id);
CREATE INDEX IF NOT EXISTS idx_referrals_sales_id ON referrals(sales_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_name ON referrals(referrer_name);
CREATE INDEX IF NOT EXISTS idx_referrals_result_status ON referrals(result_status);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_sales_id ON weekly_reports(sales_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_start ON weekly_reports(week_start_date);
