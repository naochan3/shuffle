-- Supabaseダッシュボードで実行するSQL
CREATE TABLE affiliate_links (
  id TEXT PRIMARY KEY,
  affiliate_url TEXT NOT NULL,
  pixel_code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 