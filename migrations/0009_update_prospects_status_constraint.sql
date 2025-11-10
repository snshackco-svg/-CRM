-- Update prospects status constraint to include kanban board statuses
-- Migration: 0026_update_prospects_status_constraint

-- SQLiteはALTER TABLE ... MODIFY COLUMNをサポートしていないため、
-- テーブルを再作成する必要があります

-- 1. 一時テーブルを作成（新しいステータス制約付き）
CREATE TABLE prospects_new (
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
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN (
    'new', 'researching', 'contacted', 'meeting_scheduled', 'negotiating', 
    'qualified', 'contracted', 'paid', 'not_qualified',
    'partnership_candidate', 'partnership',
    'won', 'lost'
  )),
  source TEXT,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_value INTEGER,
  expected_close_date DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_partnership INTEGER NOT NULL DEFAULT 0 CHECK(is_partnership IN (0, 1)),
  master_contact_id INTEGER
);

-- 2. データをコピー
INSERT INTO prospects_new 
SELECT id, company_name, company_url, industry, company_size, contact_name, 
       contact_position, contact_email, contact_phone, sales_id, status, source, 
       priority, estimated_value, expected_close_date, notes, created_at, updated_at,
       is_partnership, master_contact_id
FROM prospects;

-- 3. 古いテーブルを削除
DROP TABLE prospects;

-- 4. 新しいテーブルをリネーム
ALTER TABLE prospects_new RENAME TO prospects;

-- 5. インデックスを再作成
CREATE INDEX IF NOT EXISTS idx_prospects_sales_id ON prospects(sales_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_priority ON prospects(priority);
CREATE INDEX IF NOT EXISTS idx_prospects_is_partnership ON prospects(is_partnership);
