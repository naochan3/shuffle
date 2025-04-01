import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import supabase from '../lib/supabase';

export default function Admin() {
  const [pixelCode, setPixelCode] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [shortId, setShortId] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('確認中...');

  // Supabase接続確認
  useEffect(() => {
    async function checkConnection() {
      try {
        const { error } = await supabase.from('affiliate_links').select('count').single();
        if (error && error.code !== 'PGRST116') { // PGRST116は「結果なし」エラーで正常
          console.error('Supabase接続エラー:', error);
          setConnectionStatus('接続エラー: ' + error.message);
        } else {
          setConnectionStatus('接続済み');
        }
      } catch (err) {
        console.error('予期しないエラー:', err);
        setConnectionStatus('接続エラー: ' + (err.message || '不明なエラー'));
      }
    }

    checkConnection();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResultUrl('');

    if (!pixelCode || !affiliateUrl || !shortId) {
      setError('すべてのフィールドを入力してください。');
      setLoading(false);
      return;
    }

    try {
      // Supabaseにデータを保存
      const { data, error } = await supabase
        .from('affiliate_links')
        .upsert({
          id: shortId,
          affiliate_url: affiliateUrl,
          pixel_code: pixelCode,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Supabaseエラー:', error);
        throw new Error(error.message || 'データの保存中にエラーが発生しました');
      }

      // 成功した場合、生成されたURLを表示
      setResultUrl(`${window.location.origin}/${shortId}`);
    } catch (err) {
      console.error('Error saving data:', err);
      setError(err.message || 'データの保存中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>短縮URL管理画面</title>
        <meta name="description" content="TikTok Pixel リダイレクト管理" />
      </Head>

      <main className="container mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-center">短縮URL管理画面</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            ホームに戻る
          </Link>
        </div>
        
        {connectionStatus !== '接続済み' && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-6">
            <p className="text-yellow-700">
              <strong>接続状態:</strong> {connectionStatus}
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              Supabaseへの接続に問題がある場合、データの保存ができない可能性があります。
            </p>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="pixelCode" className="block text-sm font-medium text-gray-700 mb-1">
                TikTok Pixelコード
              </label>
              <textarea
                id="pixelCode"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={5}
                value={pixelCode}
                onChange={(e) => setPixelCode(e.target.value)}
                placeholder="&lt;script&gt;...&lt;/script&gt;"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="affiliateUrl" className="block text-sm font-medium text-gray-700 mb-1">
                アフィリエイトURL
              </label>
              <input
                type="url"
                id="affiliateUrl"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={affiliateUrl}
                onChange={(e) => setAffiliateUrl(e.target.value)}
                placeholder="https://example.com/affiliate-link"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="shortId" className="block text-sm font-medium text-gray-700 mb-1">
                短縮URLの名前
              </label>
              <input
                type="text"
                id="shortId"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={shortId}
                onChange={(e) => setShortId(e.target.value)}
                placeholder="shuffle"
              />
            </div>

            <button
              type="submit"
              disabled={loading || connectionStatus !== '接続済み'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存して短縮URLを生成'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {resultUrl && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-gray-700 mb-2">生成された短縮URL:</p>
              <div className="flex items-center">
                <a
                  href={resultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {resultUrl}
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resultUrl);
                    alert('URLをコピーしました！');
                  }}
                  className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                  title="URLをコピー"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 