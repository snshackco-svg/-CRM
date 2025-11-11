-- Create users table (基礎テーブル)
-- This table must exist before other tables due to foreign key constraints

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'sales' CHECK(role IN ('admin', 'pm', 'sales')),
  full_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default users (for development/demo)
INSERT OR IGNORE INTO users (id, username, email, role, full_name) VALUES
  (1, 'admin', 'admin@example.com', 'admin', '管理者'),
  (2, 'pm', 'pm@example.com', 'pm', 'PM担当'),
  (3, 'sales', 'sales@example.com', 'sales', '営業担当');
