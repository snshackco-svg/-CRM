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
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, year, month)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_kpi_monthly_goals_user_date ON kpi_monthly_goals(user_id, year, month);

-- Insert default goals for existing users
INSERT OR IGNORE INTO kpi_monthly_goals (user_id, year, month, deals_goal, appointments_goal, revenue_goal)
SELECT 
  id as user_id,
  CAST(strftime('%Y', 'now') AS INTEGER) as year,
  CAST(strftime('%m', 'now') AS INTEGER) as month,
  5 as deals_goal,
  20 as appointments_goal,
  2000000 as revenue_goal
FROM users;
