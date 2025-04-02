import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';
import supabase from '../lib/supabase';

// クライアントサイドでのリダイレクト用コンポーネント
export default function RedirectPage({ link, error }) {
  const router = useRouter();

  useEffect(() => {
    // データが読み込まれるまでは何もしない
    if (router.isFallback) return;

    // エラーがある場合は404ページに遷移
    if (error || !link) {
      router.push('/404');
      return;
    }

    // ピクセルコードをHEADに追加（HTMLとしてパース）
    if (link.pixel_code) {
      try {
        const pixelScript = document.createElement('div');
        pixelScript.innerHTML = link.pixel_code;
        document.head.appendChild(pixelScript);
        
        // トラッキングコードが実行される時間を少し待ってからリダイレクト
        setTimeout(() => {
          window.location.href = link.affiliate_url;
        }, 2000);
      } catch (err) {
        console.error('ピクセルコード実行エラー:', err);
        // エラーが発生しても最終的にはリダイレクト
        window.location.href = link.affiliate_url;
      }
    } else {
      // ピクセルコードがない場合は直接リダイレクト
      window.location.href = link.affiliate_url;
    }
  }, [router, link, error]);

  // ページ全体のマークアップ
  return (
    <>
      <Head>
        <title>リダイレクト中...</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f7fafc',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', marginBottom: '20px' }}>リダイレクト中...</div>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #3498db', 
            borderRadius: '50%',
            margin: '0 auto',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    </>
  );
}

// サーバーサイドでデータ取得
export async function getServerSideProps({ params }) {
  const { id } = params;
  
  if (!id) {
    return {
      props: {
        error: 'IDが指定されていません',
        link: null,
      }
    };
  }

  try {
    console.log('Supabaseからデータ取得中...');
    
    // IDをもとにSupabaseからデータを取得
    const { data, error } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabaseからのデータ取得エラー:', error.message);
      return {
        props: {
          error: `データ取得エラー: ${error.message}`,
          link: null
        }
      };
    }

    if (!data) {
      console.log('データが見つかりません。ID:', id);
      return {
        props: {
          error: 'ページが見つかりません',
          link: null
        }
      };
    }

    console.log('データ取得成功:', data.id);
    
    return {
      props: {
        link: data,
        error: null
      }
    };
  } catch (error) {
    console.error('予期しないエラー:', error);
    
    return {
      props: {
        error: `予期しないエラー: ${error.message || '不明なエラー'}`,
        link: null
      }
    };
  }
} 