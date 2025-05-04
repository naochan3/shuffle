-- Supabaseダッシュボードで実行するSQL
-- 既存のテーブルを削除（必要な場合）
DROP TABLE IF EXISTS affiliate_links;

-- 新しい構造でテーブルを作成
CREATE TABLE affiliate_links (
  id TEXT PRIMARY KEY,
  affiliate_url TEXT NOT NULL,
  pixel_code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLSポリシーを設定
-- 匿名ユーザーに読み取り権限を付与
CREATE POLICY "公開読み取りポリシー" ON affiliate_links
FOR SELECT USING (true);

-- 匿名ユーザーに書き込み権限を付与
CREATE POLICY "公開書き込みポリシー" ON affiliate_links
FOR INSERT WITH CHECK (true);

-- 匿名ユーザーに更新権限を付与
CREATE POLICY "公開更新ポリシー" ON affiliate_links
FOR UPDATE USING (true) WITH CHECK (true);

-- 匿名ユーザーに削除権限を付与
CREATE POLICY "公開削除ポリシー" ON affiliate_links
FOR DELETE USING (true);

-- クリックログテーブルの作成
CREATE TABLE IF NOT EXISTS click_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id TEXT NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT
);

-- クリックログテーブルにインデックスを追加
CREATE INDEX IF NOT EXISTS click_logs_link_id_idx ON click_logs(link_id);
CREATE INDEX IF NOT EXISTS click_logs_clicked_at_idx ON click_logs(clicked_at);

-- Supabaseの行レベルセキュリティ設定
ALTER TABLE click_logs ENABLE ROW LEVEL SECURITY;

-- クリックログテーブルのポリシー設定
CREATE POLICY "クリックログの参照は認証済みユーザーのみ" ON click_logs
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY "クリックログの追加は全員可能" ON click_logs
  FOR INSERT WITH CHECK (true); 