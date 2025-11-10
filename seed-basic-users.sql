-- ============================================
-- Basic Users for CRM System
-- ============================================

-- Insert basic users (compatible with new schema)
INSERT OR IGNORE INTO users (id, name, email, password_hashed, role) VALUES
  (1, '管理者', 'admin@snshack.com', 'dummy_hash', 'Admin'),
  (2, 'PM担当', 'pm@snshack.com', 'dummy_hash', 'PM'),
  (3, '営業担当', 'sales@snshack.com', 'dummy_hash', 'Sales');
