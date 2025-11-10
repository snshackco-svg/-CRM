-- Add KPI Goals table for tracking monthly targets
-- Migration: 0010_add_kpi_goals_table

CREATE TABLE IF NOT EXISTS kpi_monthly_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  deals_goal INTEGER DEFAULT 5,
  appointments_goal INTEGER DEFAULT 20,
  revenue_goal INTEGER DEFAULT 2000000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, year, month)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_kpi_monthly_goals_user_date ON kpi_monthly_goals(user_id, year, month);
