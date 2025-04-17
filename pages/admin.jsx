import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import supabase from '../lib/supabase';
import { useRouter } from 'next/router';
import AuthCheck from '../components/AuthCheck';

// TikTok Pixelコードのデフォルト値
const DEFAULT_PIXEL_CODE = ``;

export default function AdminPanel() {
  const router = useRouter();
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
                <p className="text-yellow-600">⚠ トラッキングコードが見つかりません</p>
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
                            alert('CompletePaymentイベントを追加しました！');
                            // 更新したデータを再読み込み
                            loadSavedLinks();
                            // モーダルを閉じる
                            setShowPixelModal(false);
                          }
                        });
                    }}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    CompletePaymentイベントを追加
                  </button>
                </div>
              ) : (
                <p className="text-green-600 mt-2">✓ CompletePaymentイベントが含まれています - TikTok商品リンクとして使用できます</p>
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

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('isAuthenticated');
      window.location.href = '/login';
    }
  };

  return (
    <AuthCheck>
      <div className="min-h-screen bg-gray-100">
        <Head>
          <title>管理者パネル | Shuffle</title>
          <meta name="description" content="Shuffle管理者パネル" />
        </Head>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">管理者パネル</h1>
            <button 
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg text-sm transition-colors"
            >
              ログアウト
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">短縮URLリスト</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">元のURL</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">短縮コード</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">クリック数</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {savedLinks.map(link => (
                      <tr key={link.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{link.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                          {link.affiliate_url}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500 font-medium">
                          {link.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{link.clicks}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => openPixelModal(link)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            確認
                          </button>
                          <button 
                            onClick={() => handleDelete(link.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ピクセルコード確認モーダル */}
      <PixelPreviewModal />
    </AuthCheck>
  );
} 