import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AuthCheck({ children }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // セッションストレージから認証状態を確認
    const authStatus = sessionStorage.getItem('isAuthenticated');
    
    if (authStatus !== 'true') {
      // 認証されていない場合はトップページに戻す
      router.push('/');
    } else {
      setIsAuthenticated(true);
    }
    
    setLoading(false);
  }, [router]);

  // 読み込み中または認証チェック中は何も表示しない
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">ロード中...</div>;
  }

  // 認証済みの場合のみ子コンポーネントを表示
  return isAuthenticated ? <>{children}</> : null;
} 