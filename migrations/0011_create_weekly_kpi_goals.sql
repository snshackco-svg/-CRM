-- Create weekly KPI goals table (columns already added to monthly goals)
-- Migration: 0011_create_weekly_kpi_goals

CREATE TABLE IF NOT EXISTS kpi_weekly_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  week_number INTEGER NOT NULL, -- 1-5 (第何週)
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  appointments_goal INTEGER DEFAULT 5,
  qualified_goal INTEGER DEFAULT 4,
  negotiations_goal INTEGER DEFAULT 3,
  deals_goal INTEGER DEFAULT 1,
  customer_unit_price_goal INTEGER DEFAULT 400000,
  revenue_goal INTEGER DEFAULT 500000,
  gross_profit_goal INTEGER DEFAULT 250000,
  new_agencies_goal INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, year, month, week_number)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_kpi_weekly_goals_user_date ON kpi_weekly_goals(user_id, year, month, week_number);
