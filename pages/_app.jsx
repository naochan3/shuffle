import '../styles/globals.css';
import React, { useEffect } from 'react';
import supabase from '../lib/supabase';

// 一般的なエラーキャッチ用のErrorBoundaryコンポーネント
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    // エラー状態をセット
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // エラーロギング（必要に応じて）
    console.error('エラーを捕捉:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // エラー時により適切なメッセージを表示
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">ページを読み込み中です</p>
              <p className="mt-2 text-sm text-gray-500">しばらくお待ちください</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                再読み込み
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // アプリ起動時にSupabase接続をテスト
    const testConnection = async () => {
      try {
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('Supabase Key exists:', Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
        
        const { data, error } = await supabase.from('affiliate_links').select('count').maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Supabase接続エラー:', error);
        } else {
          console.log('Supabase接続成功！');
        }
      } catch (err) {
        console.error('Supabase初期化エラー:', err);
      }
    };

    testConnection();
  }, []);

  // グローバルなエラーハンドラー
  useEffect(() => {
    const handleError = (event) => {
      // デフォルトのエラー表示を抑制
      event.preventDefault()
      
      // エラー情報をコンソールに記録
      console.error('グローバルエラーをキャッチ:', event instanceof ErrorEvent ? event.error : event)
    }

    // 未処理の例外をキャッチ
    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError)
      window.addEventListener('unhandledrejection', handleError)
    }

    // クリーンアップ
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', handleError)
        window.removeEventListener('unhandledrejection', handleError)
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

export default MyApp; 