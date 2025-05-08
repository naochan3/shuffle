import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import supabase from '../lib/supabase';
import AuthCheck from '../components/AuthCheck';
import { format, subDays, startOfWeek, startOfMonth, isAfter, parseISO, isWithinInterval } from 'date-fns';
import { ja } from 'date-fns/locale';

// ダッシュボードページ
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    daily: [],
    weekly: [],
    monthly: [],
    allTime: [] // 全期間のデータを追加
  });
  const [activeTab, setActiveTab] = useState('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('linkId');
  const [searchResults, setSearchResults] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [uniqueLinksCount, setUniqueLinksCount] = useState(0); // ユニークリンク数追加
  
  // 日付範囲カスタム指定用
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customDateActive, setCustomDateActive] = useState(false);
  
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

      // ユニークなリンク数を設定
      setUniqueLinksCount(links.length);

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

      // 日別、週別、月別、全期間のクリック数を集計
      const dailyClicks = {};
      const weeklyClicks = {};
      const monthlyClicks = {};
      const allTimeClicks = {};
      
      // 最終クリック時間を記録するオブジェクト
      const dailyTimestamps = {};
      const weeklyTimestamps = {};
      const monthlyTimestamps = {};
      const allTimeTimestamps = {};

      // カスタム日付範囲のクリック数
      const customRangeClicks = {};
      const customRangeTimestamps = {};
      
      // カスタム日付範囲の解析
      let customStartDate = null;
      let customEndDate = null;
      
      if (startDate && endDate) {
        customStartDate = new Date(startDate);
        customEndDate = new Date(endDate);
        // 終了日は23:59:59に設定して当日を含む
        customEndDate.setHours(23, 59, 59, 999);
      }

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
          if (!weeklyClicks[linkId]) {
            weeklyClicks[linkId] = 0;
            weeklyTimestamps[linkId] = [];
          }
          weeklyClicks[linkId]++;
          weeklyTimestamps[linkId].push(log.clicked_at);
        }

        // 月別集計（先月の1日から今日まで）
        if (isAfter(clickDate, lastMonthStart)) {
          if (!monthlyClicks[linkId]) {
            monthlyClicks[linkId] = 0;
            monthlyTimestamps[linkId] = [];
          }
          monthlyClicks[linkId]++;
          monthlyTimestamps[linkId].push(log.clicked_at);
        }
        
        // 全期間集計（すべてのクリック）
        if (!allTimeClicks[linkId]) {
          allTimeClicks[linkId] = 0;
          allTimeTimestamps[linkId] = [];
        }
        allTimeClicks[linkId]++;
        allTimeTimestamps[linkId].push(log.clicked_at);
        
        // カスタム日付範囲の集計
        if (customStartDate && customEndDate) {
          if (isWithinInterval(clickDate, { start: customStartDate, end: customEndDate })) {
            if (!customRangeClicks[linkId]) {
              customRangeClicks[linkId] = 0;
              customRangeTimestamps[linkId] = [];
            }
            customRangeClicks[linkId]++;
            customRangeTimestamps[linkId].push(log.clicked_at);
          }
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
            lastClicked: timestampsObj[linkId] && timestampsObj[linkId].length > 0 ? 
              timestampsObj[linkId].sort((a, b) => new Date(b) - new Date(a))[0] : null
          }))
          .sort((a, b) => b.count - a.count) // クリック数で降順ソート
          .slice(0, 10); // 上位10件を取得
      };

      const statsData = {
        daily: createRankingData(dailyClicks, dailyTimestamps),
        weekly: createRankingData(weeklyClicks, weeklyTimestamps),
        monthly: createRankingData(monthlyClicks, monthlyTimestamps),
        allTime: createRankingData(allTimeClicks, allTimeTimestamps)
      };
      
      // カスタム日付範囲のデータを追加（設定されている場合）
      if (customStartDate && customEndDate) {
        statsData.customRange = createRankingData(customRangeClicks, customRangeTimestamps);
        setCustomDateActive(true);
      } else {
        setCustomDateActive(false);
      }

      setStats(statsData);
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
  
  // 日付範囲が変更されたときにデータを取得
  const handleDateRangeSubmit = (e) => {
    e.preventDefault();
    if (startDate && endDate) {
      fetchData();
      // カスタム日付範囲タブに切り替え
      setActiveTab('customRange');
    }
  };

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
      case 'targetUrl':
        results = allLogs.filter(log => 
          log.targetUrl.toLowerCase().includes(query)
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
    <div className="mt-4 overflow-hidden"> {/* overflow-x-auto から overflow-hidden に変更 */}
      <table className="min-w-full divide-y divide-gray-200 table-fixed"> {/* table-fixed を追加してカラム幅を固定 */}
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[5%]">
              ランク
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
              リンクID
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
              短縮URL
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[40%]">
              元URL
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
              最終クリック
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
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
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
                  {item.linkId}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
                  <a href={item.shortUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {item.shortUrl.split('/').pop()}
                  </a>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  <div className="truncate">
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
      <div className="mt-4 overflow-hidden"> {/* 横スクロール無効化 */}
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                リンクID
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                短縮URL
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[30%]">
                元URL
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                クリック日時
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                デバイス
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
                    {item.link_id || item.linkId}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
                    <a href={item.shortUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {item.shortUrl.split('/').pop()}
                    </a>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    <div className="truncate">
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
                    <div className="truncate">
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
                  <option value="targetUrl">元URL</option>
                  <option value="count">クリック数</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <input
                  type={searchField === 'count' ? 'number' : 'text'}
                  placeholder={searchField === 'count' ? '数値で入力してください' : '検索キーワード'}
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
              {searchResults && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  クリア
                </button>
              )}
            </div>

            {searchResults && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">検索結果 ({searchResults.length}件)</h3>
                <SearchResultsTable results={searchResults} />
              </div>
            )}
          </div>
          
          {/* 日付範囲選択フォーム */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">日付範囲指定</h2>
            <form onSubmit={handleDateRangeSubmit} className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                期間を適用
              </button>
              {customDateActive && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setCustomDateActive(false);
                    setActiveTab('daily'); // デフォルトタブに戻す
                    fetchData(); // データを再取得
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  期間指定をクリア
                </button>
              )}
            </form>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">アクセス統計</h2>
            
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex flex-wrap gap-4">
                <button
                  onClick={() => setActiveTab('daily')}
                  className={`py-2 px-3 border-b-2 font-medium text-sm ${
                    activeTab === 'daily'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  デイリー
                </button>
                <button
                  onClick={() => setActiveTab('weekly')}
                  className={`py-2 px-3 border-b-2 font-medium text-sm ${
                    activeTab === 'weekly'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ウィークリー
                </button>
                <button
                  onClick={() => setActiveTab('monthly')}
                  className={`py-2 px-3 border-b-2 font-medium text-sm ${
                    activeTab === 'monthly'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  マンスリー
                </button>
                <button
                  onClick={() => setActiveTab('allTime')}
                  className={`py-2 px-3 border-b-2 font-medium text-sm ${
                    activeTab === 'allTime'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  全期間
                </button>
                {customDateActive && (
                  <button
                    onClick={() => setActiveTab('customRange')}
                    className={`py-2 px-3 border-b-2 font-medium text-sm ${
                      activeTab === 'customRange'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    カスタム期間
                  </button>
                )}
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
                {activeTab === 'allTime' && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">全期間ランキング</h3>
                    <RankingTable data={stats.allTime} />
                  </div>
                )}
                {activeTab === 'customRange' && customDateActive && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      カスタム期間ランキング ({startDate} 〜 {endDate})
                    </h3>
                    <RankingTable data={stats.customRange || []} />
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
                <p className="mt-1">{uniqueLinksCount} 件</p>
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