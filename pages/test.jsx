import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import supabase from '../lib/supabase';
import AuthCheck from '../components/AuthCheck';
import { format, subDays, startOfWeek, startOfMonth, isAfter } from 'date-fns';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 日付範囲を計算
        const now = new Date();
        const yesterday = subDays(now, 1);
        const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        const lastMonthStart = startOfMonth(subDays(now, 30));

        // すべてのクリックログを取得
        const { data: clickLogs, error: clickLogsError } = await supabase
          .from('click_logs')
          .select('*')
          .order('clicked_at', { ascending: false });

        if (clickLogsError) {
          throw new Error(`クリックログの取得中にエラーが発生しました: ${clickLogsError.message}`);
        }

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

        // 日別、週別、月別のクリック数を集計
        const dailyClicks = {};
        const weeklyClicks = {};
        const monthlyClicks = {};

        clickLogs.forEach(log => {
          const clickDate = new Date(log.clicked_at);
          const linkId = log.link_id;

          // 日別集計（昨日から今日まで）
          if (isAfter(clickDate, yesterday)) {
            dailyClicks[linkId] = (dailyClicks[linkId] || 0) + 1;
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
        const createRankingData = (clicksObj) => {
          return Object.entries(clicksObj)
            .map(([linkId, count]) => ({
              linkId,
              count,
              url: linkMap[linkId]?.affiliate_url || '不明なURL'
            }))
            .sort((a, b) => b.count - a.count) // クリック数で降順ソート
            .slice(0, 10); // 上位10件を取得
        };

        setStats({
          daily: createRankingData(dailyClicks),
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

    fetchData();
  }, []);

  // 表形式でランキングを表示するコンポーネント
  const RankingTable = ({ data }) => (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ランク
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              リンクID
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              URL
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              クリック数
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                データがありません
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={item.linkId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.linkId}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="max-w-xs truncate">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {item.url}
                    </a>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.count}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded p-4">
                <p className="text-sm font-medium text-gray-500">データ集計時間</p>
                <p className="mt-1">{format(new Date(), 'yyyy年MM月dd日 HH:mm:ss', { locale: ja })}</p>
              </div>
              <div className="border rounded p-4">
                <p className="text-sm font-medium text-gray-500">総記録リンク数</p>
                <p className="mt-1">{Object.keys(stats.monthly).length} 件</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthCheck>
  );
} 