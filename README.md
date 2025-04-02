# Shuffle - URL短縮&リダイレクトサービス

TikTok Pixelコードとアフィリエイトリンクを簡単に管理できるURL短縮ツール。

## 機能

- TikTok Pixelトラッキングの実装
- 購入価格に基づいたコンバージョン計測が可能
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
  pixel_id TEXT NOT NULL,
  value NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

5. 開発サーバーを起動:
```bash
npm run dev
```

## 使用方法

1. `/admin` ページにアクセスして、管理画面を開きます。
2. TikTok Pixel ID、アフィリエイトURL、商品価格（オプション）、短縮URLの名前を入力します。
3. 保存すると、短縮URLが生成されます。
4. 生成されたURLにアクセスすると、TikTokのイベントが発火し、アフィリエイトリンクにリダイレクトされます。

## コンバージョン計測について

- 商品価格（value）を設定した場合、TikTok Pixelの「Purchase」イベントが発火します
- 価格設定がない場合は「ClickButton」イベントが発火します
- 全てのイベントは通貨単位「JPY」で計測されます

## ライセンス

MIT

## 作者

Your Name 