import { useState, useEffect } from 'react';

export default function TestEnv() {
  const [envVars, setEnvVars] = useState({
    supabaseUrl: null,
    supabaseKey: null,
    nodeEnv: null
  });

  useEffect(() => {
    setEnvVars({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set but hidden' : 'Not set',
      nodeEnv: process.env.NODE_ENV || 'Not set'
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6">環境変数テスト</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">環境変数</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">変数名</th>
              <th className="text-left py-2">値</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">NEXT_PUBLIC_SUPABASE_URL</td>
              <td className="py-2">{envVars.supabaseUrl}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">NEXT_PUBLIC_SUPABASE_ANON_KEY</td>
              <td className="py-2">{envVars.supabaseKey}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">NODE_ENV</td>
              <td className="py-2">{envVars.nodeEnv}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6">
          <p className="text-gray-700">
            <strong>注意:</strong> 環境変数は<code className="bg-gray-100 px-1">.env.local</code>ファイルで設定され、
            <code className="bg-gray-100 px-1">NEXT_PUBLIC_</code>プレフィックスを持つ変数のみクライアントサイドで利用可能です。
          </p>
        </div>
      </div>
    </div>
  );
} 