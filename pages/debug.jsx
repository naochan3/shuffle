import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export default function Debug() {
  const [status, setStatus] = useState('テスト中...');
  const [logs, setLogs] = useState([]);
  const [supabaseUrl, setSupabaseUrl] = useState('取得中...');
  const [keyStatus, setKeyStatus] = useState('取得中...');
  const [directTest, setDirectTest] = useState(null);

  useEffect(() => {
    // 環境変数を取得
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    setSupabaseUrl(url || 'Not set');
    setKeyStatus(key ? 'Set (hidden)' : 'Not set');
    
    addLog('環境変数チェック開始');
    addLog(`NEXT_PUBLIC_SUPABASE_URL: ${url ? '設定済み' : '未設定'}`);
    addLog(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${key ? '設定済み' : '未設定'}`);
    
    if (!url || !key) {
      setStatus('環境変数が設定されていません');
      return;
    }
    
    // 新しいクライアントを直接作成してテスト
    try {
      addLog('新規Supabaseクライアント作成中...');
      const directClient = createClient(url, key);
      setDirectTest(directClient);
      
      // 接続テスト実行
      testDirectConnection(directClient);
    } catch (err) {
      addLog(`クライアント作成エラー: ${err.message}`);
      setStatus('接続エラー');
    }
  }, []);
  
  async function testDirectConnection(client) {
    try {
      addLog('テーブル存在確認中...');
      
      const { data, error } = await client
        .from('affiliate_links')
        .select('count')
        .limit(1);
        
      if (error) {
        addLog(`クエリエラー: ${error.message} (Code: ${error.code})`);
        if (error.code === '42P01') {
          addLog('エラー原因: テーブルが存在しません');
        } else if (error.code === 'PGRST301') {
          addLog('エラー原因: RLSポリシーが設定されていません');
        }
        setStatus('データベースエラー');
      } else {
        addLog('接続成功！データベースに正常にアクセスできます');
        setStatus('接続成功');
      }
    } catch (err) {
      addLog(`予期しないエラー: ${err.message}`);
      setStatus('接続エラー');
    }
  }
  
  function addLog(message) {
    setLogs(prev => [...prev, `${new Date().toISOString().substr(11, 8)} - ${message}`]);
  }
  
  // 手動でテストを実行するハンドラー
  const handleManualTest = async () => {
    if (!directTest) return;
    
    addLog('手動テスト開始...');
    await testDirectConnection(directTest);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Supabase 詳細デバッグ</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            ホームに戻る
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">環境設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>ステータス:</strong> <span className={`font-medium ${status === '接続成功' ? 'text-green-600' : 'text-red-600'}`}>{status}</span></p>
            </div>
            <div>
              <p><strong>接続URL:</strong> {supabaseUrl}</p>
              <p><strong>API Key:</strong> {keyStatus}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <button 
              onClick={handleManualTest}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
              disabled={!directTest}
            >
              接続を再テスト
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">デバッグログ</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-80 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))}
            {logs.length === 0 && <div className="text-gray-500">ログはまだありません...</div>}
          </div>
        </div>
      </div>
    </div>
  );
} 