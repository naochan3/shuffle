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
  const [savedLinks, setSavedLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [selectedLink, setSelectedLink] = useState(null);
  const [showPixelModal, setShowPixelModal] = useState(false);

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
          // 接続成功したら保存済みデータを読み込む
          loadSavedLinks();
        }
      } catch (err) {
        console.error('予期しないエラー:', err);
        setConnectionStatus('接続エラー: ' + (err.message || '不明なエラー'));
      }
    }

    checkConnection();
  }, []);

  // 保存済みリンクを取得
  const loadSavedLinks = async () => {
    setLoadingLinks(true);
    try {
      const { data, error } = await supabase
        .from('affiliate_links')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('データ取得エラー:', error);
      } else {
        setSavedLinks(data || []);
      }
    } catch (err) {
      console.error('データ取得中のエラー:', err);
    } finally {
      setLoadingLinks(false);
    }
  };

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
<<<<<<< HEAD
      // URLを解析
      const urlObj = new URL(affiliateUrl);
      
      // ピクセルコードをURLパラメータとして追加
      const pixelParams = new URLSearchParams(urlObj.search);
      
      // TikTokピクセルパラメータを追加
      if (pixelCode.includes('TikTok')) {
        pixelParams.append('ttclid', '${ttclid}');  // TikTokクリックID用プレースホルダー
        pixelParams.append('event', 'complete_payment');
      }
      
      // 新しいURLを構築
      urlObj.search = pixelParams.toString();
      const modifiedUrl = urlObj.toString();

=======
>>>>>>> b3ac0f378d7837e7be878182c241655c269cde83
      // Supabaseにデータを保存
      const { data, error } = await supabase
        .from('affiliate_links')
        .upsert({
          id: shortId,
          affiliate_url: affiliateUrl,
<<<<<<< HEAD
          modified_url: modifiedUrl,
=======
>>>>>>> b3ac0f378d7837e7be878182c241655c269cde83
          pixel_code: pixelCode,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Supabaseエラー:', error);
        throw new Error(error.message || 'データの保存中にエラーが発生しました');
      }

      // 成功した場合、生成されたURLを表示
      setResultUrl(`${window.location.origin}/${shortId}`);
      
      // 保存済みデータを再読み込み
      loadSavedLinks();
      
      // フォームをクリア
      setShortId('');
      setAffiliateUrl('');
      setPixelCode('');
    } catch (err) {
      console.error('Error saving data:', err);
      setError(err.message || 'データの保存中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // 保存済みデータの削除
  const handleDelete = async (id) => {
    if (!confirm(`ID: ${id} のリンクを削除してもよろしいですか？`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('affiliate_links')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('削除エラー:', error);
        alert(`削除中にエラーが発生しました: ${error.message}`);
      } else {
        // 削除成功後、リストを更新
        loadSavedLinks();
      }
    } catch (err) {
      console.error('削除処理中のエラー:', err);
      alert('削除処理中にエラーが発生しました');
    }
  };

  // テキストをクリップボードにコピー
  const copyToClipboard = (text, message = 'コピーしました！') => {
    navigator.clipboard.writeText(text)
      .then(() => alert(message))
      .catch(err => {
        console.error('コピー失敗:', err);
        alert('コピーに失敗しました。');
      });
  };

  // ピクセルコードを確認
  const openPixelModal = (link) => {
    setSelectedLink(link);
    setShowPixelModal(true);
  };

  // ピクセルコードのプレビュー
  const PixelPreviewModal = () => {
    if (!showPixelModal || !selectedLink) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">ピクセルコード確認: {selectedLink.id}</h3>
            <button
              onClick={() => setShowPixelModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="font-semibold mb-2">アフィリエイトURL:</p>
            <div className="flex items-center bg-gray-50 p-2 rounded mb-4">
              <p className="text-gray-700 break-all flex-grow">{selectedLink.affiliate_url}</p>
              <button
                onClick={() => copyToClipboard(selectedLink.affiliate_url, 'アフィリエイトURLをコピーしました！')}
                className="ml-2 p-1 text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <p className="font-semibold mb-2">ピクセルコード:</p>
            <pre className="bg-gray-50 p-3 rounded overflow-x-auto text-sm">
              {selectedLink.pixel_code}
            </pre>
            <button
              onClick={() => copyToClipboard(selectedLink.pixel_code, 'ピクセルコードをコピーしました！')}
              className="mt-2 text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              コードをコピー
            </button>
          </div>

          <div className="mb-4">
            <p className="font-semibold mb-2">ピクセルコード解析:</p>
            <div className="bg-gray-50 p-3 rounded">
              {selectedLink.pixel_code.includes('TikTok') ? (
                <p className="text-green-600">✓ TikTokのピクセルコードが含まれています</p>
              ) : (
                <p className="text-yellow-600">⚠ TikTokのピクセルコードが見つかりません</p>
              )}
              
              {selectedLink.pixel_code.includes('<script') ? (
                <p className="text-green-600">✓ scriptタグが含まれています</p>
              ) : (
                <p className="text-red-600">✗ scriptタグが含まれていません - 正しく動作しない可能性があります</p>
              )}
              
              {selectedLink.pixel_code.includes('ttq.track') || selectedLink.pixel_code.includes('track(') ? (
                <p className="text-green-600">✓ トラッキングコードが含まれています</p>
              ) : (
                <p className="text-yellow-600">⚠ トラッキングコードが見つかりません</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowPixelModal(false)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
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
        
        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto mb-8">
          <h2 className="text-xl font-semibold mb-4">新規リンク作成</h2>
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
                  onClick={() => copyToClipboard(resultUrl)}
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
        
        {/* 保存済みリンク一覧 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">保存済みリンク一覧</h2>
            <button 
              onClick={loadSavedLinks} 
              className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md"
              disabled={loadingLinks}
            >
              {loadingLinks ? '読込中...' : '更新'}
            </button>
          </div>
          
          {loadingLinks ? (
            <p className="text-center py-4 text-gray-500">データを読み込み中...</p>
          ) : savedLinks.length === 0 ? (
            <p className="text-center py-4 text-gray-500">保存されたリンクがありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">アフィリエイトURL</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">作成日時</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {savedLinks.map((link) => (
                    <tr key={link.id}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{link.id}</td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">
                          {link.affiliate_url}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(link.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <a
                            href={`/${link.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            テスト
                          </a>
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/${link.id}`, '短縮URLをコピーしました！')}
                            className="text-green-600 hover:text-green-900"
                            title="短縮URLをコピー"
                          >
                            URLコピー
                          </button>
                          <button
                            onClick={() => copyToClipboard(link.affiliate_url, 'アフィリエイトURLをコピーしました！')}
                            className="text-blue-600 hover:text-blue-900"
                            title="元のURLをコピー"
                          >
                            元URLコピー
                          </button>
                          <button
                            onClick={() => openPixelModal(link)}
                            className="text-orange-600 hover:text-orange-900"
                            title="ピクセルコードを確認"
                          >
                            ピクセル確認
                          </button>
                          <button
                            onClick={() => handleDelete(link.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ピクセルコード確認モーダル */}
      <PixelPreviewModal />
    </div>
  );
} 