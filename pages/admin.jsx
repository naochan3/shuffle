import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import supabase from '../lib/supabase';

// TikTok Pixelコードのデフォルト値
const DEFAULT_PIXEL_CODE = ``;

export default function Admin() {
  const [pixelCode, setPixelCode] = useState(DEFAULT_PIXEL_CODE);
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [shortId, setShortId] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('確認中...');
  const [connectionChecked, setConnectionChecked] = useState(false); // 接続確認が完了したかどうか
  const [savedLinks, setSavedLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [selectedLink, setSelectedLink] = useState(null);
  const [showPixelModal, setShowPixelModal] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [addCompletePayment, setAddCompletePayment] = useState(true);
  
  // リンク一覧関連の状態を追加
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      } finally {
        setConnectionChecked(true); // 接続確認完了をマーク
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
        .order(sortField, { ascending: sortDirection === 'asc' });
      
      if (error) {
        console.error('データ取得エラー:', error);
        setConnectionStatus('接続エラー: ' + error.message);
      } else {
        setSavedLinks(data || []);
        // データが正常に取得できたなら接続状態も更新
        setConnectionStatus('接続済み');
      }
    } catch (err) {
      console.error('データ取得中のエラー:', err);
      setConnectionStatus('接続エラー: ' + (err.message || '不明なエラー'));
    } finally {
      setLoadingLinks(false);
    }
  };

  // ソート状態が変更されたら再読み込み
  useEffect(() => {
    loadSavedLinks();
  }, [sortField, sortDirection]);

  // ソート関数
  const handleSort = (field) => {
    if (field === sortField) {
      // 同じフィールドがクリックされた場合、ソート方向を反転
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 新しいフィールドがクリックされた場合、そのフィールドでソート
      setSortField(field);
      setSortDirection('desc'); // デフォルトは降順
    }
  };

  // 検索に一致するリンクをフィルタリング
  const filteredLinks = searchQuery
    ? savedLinks.filter((link) => link.id.toLowerCase().includes(searchQuery.toLowerCase()))
    : savedLinks;

  // ページネーション用のデータ
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLinks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLinks.length / itemsPerPage);

  // ページ変更ハンドラ
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // ランダムな文字列を生成する関数
  const generateRandomString = (length = 6) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResultUrl('');

    if (!pixelCode || !affiliateUrl || !shortId) {
      setError('すべての必須フィールドを入力してください。');
      setLoading(false);
      return;
    }

    try {
      // CompletePaymentイベントを自動的に追加（オプションが有効な場合）
      let processedPixelCode = pixelCode;
      if (addCompletePayment && !pixelCode.includes('ttq.track(\'CompletePayment\'') && 
          !pixelCode.includes('"CompletePayment"') && 
          !pixelCode.includes('event=complete payment') && 
          !pixelCode.includes('event=CompletePayment')) {
        
        if (pixelCode.includes('ttq.track(')) {
          // 既存のトラックイベントを置き換え
          processedPixelCode = pixelCode.replace(/ttq\.track\(['"]\w+['"]/g, 'ttq.track(\'CompletePayment\'');
        } else if (pixelCode.includes('ttq.page();')) {
          // page()の後にCompletePaymentを追加（改良版：contents配列を含む）
          processedPixelCode = pixelCode.replace('ttq.page();', 'ttq.page();\n  ttq.track(\'CompletePayment\', {\n    contents: [{\n      content_id: "product-link",\n      content_type: "product_link",\n      content_name: "Product Link"\n    }],\n    value: 1,\n    currency: "JPY"\n  });');
        }
      }

      // 短縮URL名に重複防止用のランダム文字列を追加
      const randomSuffix = generateRandomString(4);
      const uniqueShortId = `${shortId}-${randomSuffix}`;

      // Supabaseにデータを保存
      const { data, error } = await supabase
        .from('affiliate_links')
        .upsert({
          id: uniqueShortId,
          affiliate_url: affiliateUrl,
          pixel_code: processedPixelCode,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Supabaseエラー:', error);
        throw new Error(error.message || 'データの保存中にエラーが発生しました');
      }

      // 成功した場合、生成されたURLを表示
      setResultUrl(`${window.location.origin}/${uniqueShortId}`);
      
      // 保存済みデータを再読み込み
      loadSavedLinks();
      
      // フォームをクリア
      setShortId('');
      setAffiliateUrl('');
      setPixelCode(DEFAULT_PIXEL_CODE);
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
              {selectedLink.pixel_code.includes('TikTok') || selectedLink.pixel_code.includes('tiktok') || selectedLink.pixel_code.includes('ttq') ? (
                <p className="text-green-600">✓ TikTokのピクセルコードが含まれています</p>
              ) : (
                <p className="text-yellow-600">⚠ TikTokのピクセルコードが見つかりません</p>
              )}
              
              {selectedLink.pixel_code.includes('<script') ? (
                <p className="text-green-600">✓ scriptタグが含まれています</p>
              ) : (
                <p className="text-red-600">✗ scriptタグが含まれていません - 正しく動作しない可能性があります</p>
              )}
              
              {selectedLink.pixel_code.includes('ttq.track') || selectedLink.pixel_code.includes('track(') || selectedLink.pixel_code.includes('ClickButton') || selectedLink.pixel_code.includes('CompletePayment') ? (
                <p className="text-green-600">✓ トラッキングコードが含まれています</p>
              ) : (
                <p className="text-yellow-600">⚠ トラッキングコードが見つかりません - リダイレクト時に自動的に追加されます</p>
              )}

              {selectedLink.pixel_code.includes('ttq.load') ? (
                <p className="text-green-600">✓ ピクセルIDのロード処理が含まれています</p>
              ) : (
                <p className="text-red-600">✗ ttq.load()が見つかりません - ピクセルIDが正しく設定されていない可能性があります</p>
              )}
              
              {!selectedLink.pixel_code.includes('event=complete payment') && !selectedLink.pixel_code.includes('event=CompletePayment') && !selectedLink.pixel_code.includes('ttq.track(\'CompletePayment\'') ? (
                <div className="mt-2">
                  <p className="text-yellow-600">⚠ CompletePaymentイベントが含まれていません - TikTok商品リンクとして使用するには必要です</p>
                  <button
                    onClick={() => {
                      // 最適化されたイベント形式に置き換え
                      const updatedCode = selectedLink.pixel_code.includes('ttq.track(') 
                        ? selectedLink.pixel_code.replace(/ttq\.track\(['"]\w+['"]/g, 'ttq.track(\'CompletePayment\'')
                        : selectedLink.pixel_code.replace('ttq.page();', 'ttq.page();\n  ttq.track(\'CompletePayment\', {\n    contents: [{\n      content_id: "product-link",\n      content_type: "product_link",\n      content_name: "Product Link"\n    }],\n    value: 1,\n    currency: "JPY"\n  });');
                      
                      // ピクセルコードを更新
                      supabase
                        .from('affiliate_links')
                        .update({ pixel_code: updatedCode })
                        .eq('id', selectedLink.id)
                        .then(({ error }) => {
                          if (error) {
                            alert('ピクセルコードの更新に失敗しました: ' + error.message);
                          } else {
                            // 更新後の最新データを取得して表示
                            supabase
                              .from('affiliate_links')
                              .select('*')
                              .eq('id', selectedLink.id)
                              .single()
                              .then(({ data, error }) => {
                                if (error) {
                                  alert('更新データの取得に失敗しました');
                                } else if (data) {
                                  setSelectedLink(data);
                                  loadSavedLinks(); // リスト更新
                                  alert('CompletePaymentイベントを追加しました！');
                                }
                              });
                          }
                        });
                    }}
                    className="mt-1 text-sm px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded"
                  >
                    CompletePaymentイベントを追加
                  </button>
                </div>
              ) : (
                <p className="text-green-600">✓ CompletePaymentイベントが含まれています - TikTok商品リンクとして使用できます</p>
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
        
        {connectionStatus !== '接続済み' && connectionChecked && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-6">
            <p className="text-yellow-700">
              <strong>接続状態:</strong> {connectionStatus}
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              Supabaseへの接続に問題がある場合、データの保存ができない可能性があります。
            </p>
          </div>
        )}
        
        {!connectionChecked && (
          <div className="text-center py-4">
            <p className="text-gray-500">接続状態を確認中...</p>
          </div>
        )}
        
        {connectionChecked && (
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
                  rows={8}
                  value={pixelCode}
                  onChange={(e) => setPixelCode(e.target.value)}
                  placeholder="&lt;script&gt;...&lt;/script&gt;"
                />
                <div className="mt-2 text-sm text-gray-600">
                  <p className="font-medium">TikTok商品リンクとして使用するためのヒント:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>TikTok広告管理画面からPixelコードをコピーして貼り付けてください</li>
                    <li>イベント 'CompletePayment' が含まれていることを確認してください</li>
                    <li>TikTokの商品リンクとして使用するには、ピクセルに「event=complete payment」が必要です</li>
                    <li>作成後、ピクセル確認から必要に応じてCompletePaymentイベントを追加できます</li>
                  </ul>
                </div>
                <div className="mt-3 flex items-center">
                  <input
                    type="checkbox"
                    id="addCompletePayment"
                    checked={addCompletePayment}
                    onChange={(e) => setAddCompletePayment(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="addCompletePayment" className="ml-2 block text-sm text-gray-700">
                    CompletePaymentイベントを自動的に追加する
                  </label>
                </div>
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
                <p className="mt-1 text-xs text-gray-500">
                  入力した名前の後に自動的にランダムな文字列が追加され、「名前-xxxx」の形式になります。重複を防止するためです。
                </p>
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
        )}
        
        {connectionChecked && (
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
            
            {/* 検索フィールド */}
            <div className="mb-4">
              <div className="flex items-center">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    placeholder="IDで検索..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1); // 検索時は1ページ目に戻る
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {searchQuery && (
                <p className="mt-2 text-sm text-gray-600">
                  「{searchQuery}」の検索結果: {filteredLinks.length}件
                </p>
              )}
            </div>
            
            {loadingLinks ? (
              <p className="text-center py-4 text-gray-500">データを読み込み中...</p>
            ) : savedLinks.length === 0 ? (
              <p className="text-center py-4 text-gray-500">保存されたリンクがありません</p>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          onClick={() => handleSort('id')}
                          scope="col" 
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        >
                          <div className="flex items-center">
                            ID
                            {sortField === 'id' && (
                              <svg className="ml-1 h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                                {sortDirection === 'asc' ? (
                                  <path d="M3.5 9.5l4.5-5 4.5 5h-9z" />
                                ) : (
                                  <path d="M3.5 6.5l4.5 5 4.5-5h-9z" />
                                )}
                              </svg>
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('affiliate_url')}
                          scope="col" 
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        >
                          <div className="flex items-center">
                            アフィリエイトURL
                            {sortField === 'affiliate_url' && (
                              <svg className="ml-1 h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                                {sortDirection === 'asc' ? (
                                  <path d="M3.5 9.5l4.5-5 4.5 5h-9z" />
                                ) : (
                                  <path d="M3.5 6.5l4.5 5 4.5-5h-9z" />
                                )}
                              </svg>
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('created_at')}
                          scope="col" 
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        >
                          <div className="flex items-center">
                            作成日時
                            {sortField === 'created_at' && (
                              <svg className="ml-1 h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                                {sortDirection === 'asc' ? (
                                  <path d="M3.5 9.5l4.5-5 4.5 5h-9z" />
                                ) : (
                                  <path d="M3.5 6.5l4.5 5 4.5-5h-9z" />
                                )}
                              </svg>
                            )}
                          </div>
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentItems.map((link) => (
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
                
                {/* ページネーション */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => paginate(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <span className="sr-only">前へ</span>
                        &laquo;
                      </button>
                      
                      {/* ページ番号 */}
                      {[...Array(totalPages).keys()].map(number => (
                        <button
                          key={number + 1}
                          onClick={() => paginate(number + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                            currentPage === number + 1
                              ? 'bg-blue-50 border-blue-500 text-blue-600 z-10'
                              : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {number + 1}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <span className="sr-only">次へ</span>
                        &raquo;
                      </button>
                    </nav>
                  </div>
                )}
                
                <div className="mt-2 text-center text-sm text-gray-500">
                  全{filteredLinks.length}件中 {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredLinks.length)}件を表示
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ピクセルコード確認モーダル */}
      <PixelPreviewModal />
    </div>
  );
} 