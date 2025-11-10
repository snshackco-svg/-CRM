-- Expand KPI goals to 8 items and add weekly KPI tracking
-- Migration: 0011_expand_kpi_goals_and_add_weekly

-- Add new columns to kpi_monthly_goals
ALTER TABLE kpi_monthly_goals ADD COLUMN qualified_goal INTEGER DEFAULT 15;
ALTER TABLE kpi_monthly_goals ADD COLUMN negotiations_goal INTEGER DEFAULT 10;
ALTER TABLE kpi_monthly_goals ADD COLUMN customer_unit_price_goal INTEGER DEFAULT 400000;
ALTER TABLE kpi_monthly_goals ADD COLUMN gross_profit_goal INTEGER DEFAULT 1000000;
ALTER TABLE kpi_monthly_goals ADD COLUMN new_agencies_goal INTEGER DEFAULT 2;

-- Create weekly KPI goals table
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
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, year, month, week_number)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_kpi_weekly_goals_user_date ON kpi_weekly_goals(user_id, year, month, week_number);
