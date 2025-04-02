import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Shuffle - URL短縮&リダイレクトサービス</title>
        <meta name="description" content="TikTok Pixelコードと元のアフィリエイトURLを管理するサービス" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto py-20 px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 text-gray-800">Shuffle</h1>
          <p className="text-xl text-gray-600 mb-10">
            TikTok Pixelコードとアフィリエイトリンクを簡単に管理できるURL短縮ツール
          </p>
          
          <div className="space-y-4">
            <Link href="/admin" className="inline-block px-8 py-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-200 shadow-md">
              管理画面に進む
            </Link>
            
            <div className="pt-4">
              <Link href="/test-env" className="text-blue-600 hover:underline px-4">
                環境変数確認
              </Link>
              <Link href="/test-supabase" className="text-blue-600 hover:underline px-4">
                Supabase接続確認
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">主な機能</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3 text-gray-800">ピクセルトラッキング</h3>
              <p className="text-gray-600">
                TikTok Pixelコードを簡単に埋め込み、訪問者の行動を追跡できます。
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3 text-gray-800">カスタムURL</h3>
              <p className="text-gray-600">
                わかりやすいカスタムURLで、ユーザーに覚えやすい短縮リンクを提供します。
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3 text-gray-800">簡単管理</h3>
              <p className="text-gray-600">
                シンプルな管理画面で、URLとピクセルコードを簡単に管理できます。
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-100 py-8">
        <div className="container mx-auto text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Shuffle - すべての権利を留保</p>
        </div>
      </footer>
    </div>
  );
} 