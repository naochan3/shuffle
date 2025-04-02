import '../styles/globals.css';
import { useEffect } from 'react';
import supabase from '../lib/supabase';

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

  return <Component {...pageProps} />;
}

export default MyApp; 