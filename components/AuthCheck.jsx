import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AuthCheck({ children }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      const authStatus = sessionStorage.getItem('isAuthenticated');
      if (authStatus === 'true') {
        setIsAuthenticated(true);
      } else {
        // 認証されていない場合はログインページにリダイレクト
        router.push('/login');
      }
      setIsLoading(false);
    }
  }, [router]);

  // ローディング中は何も表示しない
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 認証されている場合のみ子コンポーネントを表示
  return isAuthenticated ? children : null;
} 