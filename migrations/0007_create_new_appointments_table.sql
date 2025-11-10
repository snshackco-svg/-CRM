-- Create new_appointments table for tracking initial appointments
-- Migration: 0024_create_new_appointments_table

CREATE TABLE IF NOT EXISTS new_appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_datetime DATETIME NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT,
  contact_name TEXT NOT NULL,
  contact_position TEXT,
  email TEXT,
  phone TEXT,
  method TEXT NOT NULL CHECK(method IN ('phone', 'email', 'dm', 'referral', 'event', 'website', 'other')),
  referrer_name TEXT,
  referrer_company TEXT,
  status TEXT NOT NULL DEFAULT '見込み外' CHECK(status IN ('見込み外', '見込み化', '商談', '契約', '入金済み', '協業候補', '協業先')),
  notes TEXT,
  sales_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_id) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_new_appointments_sales_id ON new_appointments(sales_id);
CREATE INDEX IF NOT EXISTS idx_new_appointments_datetime ON new_appointments(appointment_datetime);
CREATE INDEX IF NOT EXISTS idx_new_appointments_status ON new_appointments(status);
CREATE INDEX IF NOT EXISTS idx_new_appointments_method ON new_appointments(method);
CREATE INDEX IF NOT EXISTS idx_new_appointments_created_at ON new_appointments(created_at);
