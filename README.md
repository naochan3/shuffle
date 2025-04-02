# Shuffle - URL短縮&リダイレクトサービス

TikTok Pixelコードとアフィリエイトリンクを簡単に管理できるURL短縮ツール。

## 機能

- TikTok Pixelトラッキングコードの埋め込み
- アフィリエイトリンクを短縮URLに変換
- カスタム短縮URLの生成
- 簡単な管理画面

## 技術スタック

- Next.js
- Supabase
- Tailwind CSS
- Vercel (デプロイ)

## 環境構築

1. リポジトリをクローン:
```bash
git clone https://github.com/yourusername/shuffle.git
cd shuffle
```

2. 依存関係をインストール:
```bash
npm install
```

3. 環境変数を設定:
`.env.local`ファイルを作成し、以下の内容を設定:
```
NEXT_PUBLIC_SUPABASE_URL=あなたのSupabaseプロジェクトURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのSupabaseのpublic APIキー
```

4. Supabaseでデータベーステーブルを作成:
```sql
CREATE TABLE affiliate_links (
  id TEXT PRIMARY KEY,
  affiliate_url TEXT NOT NULL,
  pixel_code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

5. 開発サーバーを起動:
```bash
npm run dev
```

## 使用方法

1. `/admin` ページにアクセスして、管理画面を開きます。
2. TikTok Pixelコード、アフィリエイトURL、短縮URLの名前を入力します。
3. 保存すると、短縮URLが生成されます。
4. 生成されたURLにアクセスすると、ピクセルコードが埋め込まれ、アフィリエイトリンクにリダイレクトされます。

## ライセンス

MIT

## 作者

Your Name 