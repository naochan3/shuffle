import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

export default function TestSupabase() {
  const [status, setStatus] = useState('テスト中...');
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
    hasKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'
  });

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase
          .from('affiliate_links')
          .select('id')
          .limit(1);

        if (error) {
          setStatus('接続エラー');
          setError(error.message || JSON.stringify(error));
        } else {
          setStatus('接続成功');
          setTables(['affiliate_links']);
        }
      } catch (err) {
        setStatus('接続エラー');
        setError(err.message || JSON.stringify(err));
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6">Supabase接続テスト</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">環境設定</h2>
        <p><strong>Supabase URL:</strong> {config.url}</p>
        <p><strong>Supabase Key:</strong> {config.hasKey}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">接続状態</h2>
        <p><strong>ステータス:</strong> {status}</p>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            <strong>エラー:</strong> {error}
          </div>
        )}
      </div>

      {tables.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">利用可能なテーブル</h2>
          <ul className="list-disc pl-6">
            {tables.map((table) => (
              <li key={table}>{table}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 