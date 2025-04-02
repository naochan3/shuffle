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