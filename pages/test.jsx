import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import supabase from '../lib/supabase';
import AuthCheck from '../components/AuthCheck';
import { format, subDays, startOfWeek, startOfMonth, isAfter, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

// ダッシュボードページ
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    daily: [],
    weekly: [],
    monthly: []
  });
  const [activeTab, setActiveTab] = useState('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('linkId');
  const [searchResults, setSearchResults] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [totalClicks, setTotalClicks] = useState(0);
  
  // ホスト名を取得（短縮URL作成用）
  const getHostName = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  // データ取得関数を独立させる（更新ボタン用）
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 日付範囲を計算
      const now = new Date();
      const yesterday = subDays(now, 1);
      const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
      const lastMonthStart = startOfMonth(subDays(now, 30));

      // すべてのクリックログを取得（タイムスタンプ付き）
      const { data: clickLogs, error: clickLogsError } = await supabase
        .from('click_logs')
        .select('*')
        .order('clicked_at', { ascending: false });

      if (clickLogsError) {
        throw new Error(`クリックログの取得中にエラーが発生しました: ${clickLogsError.message}`);
      }

      // 総クリック数を設定
      setTotalClicks(clickLogs.length);

      // リンク情報を取得
      const { data: links, error: linksError } = await supabase
        .from('affiliate_links')
        .select('id, affiliate_url');

      if (linksError) {
        throw new Error(`リンク情報の取得中にエラーが発生しました: ${linksError.message}`);
      }

      // リンクIDからリンク情報へのマッピングを作成
      const linkMap = links.reduce((acc, link) => {
        acc[link.id] = link;
        return acc;
      }, {});

      // すべてのログを保存（検索用）
      const processedLogs = clickLogs.map(log => ({
        ...log,
        shortUrl: `${getHostName()}/${log.link_id}`,
        targetUrl: linkMap[log.link_id]?.affiliate_url || '不明なURL'
      }));
      setAllLogs(processedLogs);

      // 日別、週別、月別のクリック数を集計
      const dailyClicks = {};
      const weeklyClicks = {};
      const monthlyClicks = {};
      const dailyTimestamps = {};

      clickLogs.forEach(log => {
        const clickDate = new Date(log.clicked_at);
        const linkId = log.link_id;

        // 日別集計（昨日から今日まで）
        if (isAfter(clickDate, yesterday)) {
          if (!dailyClicks[linkId]) {
            dailyClicks[linkId] = 0;
            dailyTimestamps[linkId] = [];
          }
          dailyClicks[linkId]++;
          dailyTimestamps[linkId].push(log.clicked_at);
        }

        // 週別集計（先週の月曜から今日まで）
        if (isAfter(clickDate, lastWeekStart)) {
          weeklyClicks[linkId] = (weeklyClicks[linkId] || 0) + 1;
        }

        // 月別集計（先月の1日から今日まで）
        if (isAfter(clickDate, lastMonthStart)) {
          monthlyClicks[linkId] = (monthlyClicks[linkId] || 0) + 1;
        }
      });

      // ランキングデータを作成
      const createRankingData = (clicksObj, timestampsObj = {}) => {
        return Object.entries(clicksObj)
          .map(([linkId, count]) => ({
            linkId,
            count,
            shortUrl: `${getHostName()}/${linkId}`,
            targetUrl: linkMap[linkId]?.affiliate_url || '不明なURL',
            lastClicked: timestampsObj[linkId] ? 
              timestampsObj[linkId].sort((a, b) => new Date(b) - new Date(a))[0] : null
          }))
          .sort((a, b) => b.count - a.count) // クリック数で降順ソート
          .slice(0, 10); // 上位10件を取得
      };

      setStats({
        daily: createRankingData(dailyClicks, dailyTimestamps),
        weekly: createRankingData(weeklyClicks),
        monthly: createRankingData(monthlyClicks)
      });

      setLoading(false);
    } catch (err) {
      console.error('データ取得エラー:', err);
      setError(err.message || 'データの取得中にエラーが発生しました');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 検索機能
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    let results;
    const query = searchQuery.toLowerCase();

    switch (searchField) {
      case 'linkId':
        results = allLogs.filter(log => 
          log.link_id.toLowerCase().includes(query)
        );
        break;
      case 'url':
        results = allLogs.filter(log => 
          log.targetUrl.toLowerCase().includes(query) || 
          log.shortUrl.toLowerCase().includes(query)
        );
        break;
      case 'count':
        // クリック数は集計が必要なので異なる処理が必要
        const countMap = {};
        allLogs.forEach(log => {
          if (!countMap[log.link_id]) {
            countMap[log.link_id] = {
              count: 0,
              linkId: log.link_id,
              shortUrl: log.shortUrl,
              targetUrl: log.targetUrl
            };
          }
          countMap[log.link_id].count++;
        });

        // 数値検索の場合
        const countQuery = parseInt(query);
        if (!isNaN(countQuery)) {
          results = Object.values(countMap).filter(item => 
            item.count === countQuery
          );
        } else {
          // 数値でない場合は何も返さない
          results = [];
        }
        break;
      default:
        results = [];
    }

    // 重複を排除せずに、クリック日時の降順で表示（クリック数の場合は除く）
    if (searchField !== 'count') {
      results.sort((a, b) => new Date(b.clicked_at) - new Date(a.clicked_at));
    }
    
    setSearchResults(results);
  };

  // URLを短く表示
  const shortenUrl = (url, maxLength = 50) => {
    if (!url) return '不明なURL';
    return url.length > maxLength ? `${url.substring(0, maxLength)}...` : url;
  };

  // 表形式でランキングを表示するコンポーネント
  const RankingTable = ({ data }) => (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ランク
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              リンクID
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              短縮URL
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              元URL
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              最終クリック
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              クリック数
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500">
                データがありません
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={item.linkId}>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {index + 1}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.linkId}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  <a href={item.shortUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {item.shortUrl.split('/').pop()}
                  </a>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  <div className="max-w-xs truncate">
                    <a href={item.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {shortenUrl(item.targetUrl, 30)}
                    </a>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.lastClicked ? format(parseISO(item.lastClicked), 'yyyy/MM/dd HH:mm') : '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.count}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // 検索結果テーブル
  const SearchResultsTable = ({ results }) => {
    // ユーザーエージェント情報から推測したデバイス情報を取得
    const getDeviceInfo = (userAgent) => {
      if (!userAgent) return '不明';
      
      if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
      if (userAgent.includes('Android')) return 'Android';
      if (userAgent.includes('Windows')) return 'Windows';
      if (userAgent.includes('Mac')) return 'Mac';
      if (userAgent.includes('Linux')) return 'Linux';
      
      return 'その他';
    };
    
    return (
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                リンクID
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                短縮URL
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                元URL
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                クリック日時
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                デバイス
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                参照元
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500">
                  検索結果がありません
                </td>
              </tr>
            ) : (
              results.map((item, index) => (
                <tr key={`${item.link_id || item.linkId}-${index}-${item.id || index}`}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.link_id || item.linkId}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <a href={item.shortUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {item.shortUrl.split('/').pop()}
                    </a>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">
                      <a href={item.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {shortenUrl(item.targetUrl, 30)}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.clicked_at ? format(parseISO(item.clicked_at), 'yyyy/MM/dd HH:mm:ss') : 
                     (item.count ? `${item.count} クリック` : '-')}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.user_agent ? getDeviceInfo(item.user_agent) : '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">
                      {item.referrer || '-'}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <AuthCheck>
      <div className="min-h-screen bg-gray-50">
        <Head>
          <title>ダッシュボード | Shuffle</title>
        </Head>

        <main className="container mx-auto py-10 px-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">ダッシュボード</h1>
            <div className="flex space-x-4">
              <button
                onClick={fetchData}
                className="flex items-center text-green-600 hover:text-green-800 px-3 py-1 border border-green-600 rounded hover:bg-green-50"
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? '更新中...' : 'データ更新'}
              </button>
              <Link href="/admin" className="text-blue-600 hover:underline">
                管理画面へ
              </Link>
              <Link href="/" className="text-gray-600 hover:underline">
                ホームに戻る
              </Link>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 検索機能 */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">クリックログ検索</h2>
            <div className="flex flex-wrap gap-2">
              <div className="w-full sm:w-auto">
                <select 
                  value={searchField}
                  onChange={(e) => setSearchField(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="linkId">リンクID</option>
                  <option value="url">URL</option>
                  <option value="count">クリック数</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="検索キーワード"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                検索
              </button>
            </div>

            {searchResults && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">検索結果 ({searchResults.length}件)</h3>
                <SearchResultsTable results={searchResults} />
              </div>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">アクセス統計</h2>
            
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('daily')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'daily'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  デイリー
                </button>
                <button
                  onClick={() => setActiveTab('weekly')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'weekly'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ウィークリー
                </button>
                <button
                  onClick={() => setActiveTab('monthly')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'monthly'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  マンスリー
                </button>
              </nav>
            </div>

            {loading ? (
              <div className="py-10 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">データを読み込み中...</p>
              </div>
            ) : (
              <div className="mt-4">
                {activeTab === 'daily' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">デイリーランキング (過去24時間)</h3>
                    <RankingTable data={stats.daily} />
                  </div>
                )}
                {activeTab === 'weekly' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">ウィークリーランキング (過去7日間)</h3>
                    <RankingTable data={stats.weekly} />
                  </div>
                )}
                {activeTab === 'monthly' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">マンスリーランキング (過去30日間)</h3>
                    <RankingTable data={stats.monthly} />
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">システム情報</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border rounded p-4">
                <p className="text-sm font-medium text-gray-500">データ集計時間</p>
                <p className="mt-1">{format(new Date(), 'yyyy年MM月dd日 HH:mm:ss', { locale: ja })}</p>
              </div>
              <div className="border rounded p-4">
                <p className="text-sm font-medium text-gray-500">総記録リンク数</p>
                <p className="mt-1">{Object.keys(stats.monthly).length} 件</p>
              </div>
              <div className="border rounded p-4">
                <p className="text-sm font-medium text-gray-500">総クリック数</p>
                <p className="mt-1">{totalClicks} 回</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthCheck>
  );
} 