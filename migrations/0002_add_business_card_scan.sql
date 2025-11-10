-- Business Card Scanning Feature
-- Stores scanned business card images and extracted information

CREATE TABLE IF NOT EXISTS business_card_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  
  -- OCR extracted fields
  name TEXT,
  company_name TEXT,
  title TEXT,
  department TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  
  -- OCR metadata
  raw_ocr_text TEXT,
  ocr_confidence REAL DEFAULT 0.0,
  ai_processed INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'imported', 'rejected')),
  
  -- Link to imported connection (if imported)
  connection_id INTEGER,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (sales_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (connection_id) REFERENCES networking_connections(id) ON DELETE SET NULL
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_business_card_scans_sales_id ON business_card_scans(sales_id);
CREATE INDEX IF NOT EXISTS idx_business_card_scans_status ON business_card_scans(status);
CREATE INDEX IF NOT EXISTS idx_business_card_scans_created_at ON business_card_scans(created_at);
