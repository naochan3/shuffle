import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import supabase from '../lib/supabase';

// クライアントサイドでのリダイレクト用コンポーネント
export default function RedirectPage({ link, error: serverError }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(serverError);
  const [isReady, setIsReady] = useState(false);
  const [pixelLoaded, setPixelLoaded] = useState(false);

  // routerが準備できたかどうかを確認
  useEffect(() => {
    if (router.isReady) {
      setIsReady(true);
    }
  }, [router.isReady]);

  // ピクセルコードをページに安全に挿入する関数
  const insertPixelCode = (code) => {
    try {
      if (!code || typeof window === 'undefined') return;

      // ピクセルコードをBodyに挿入して確実に発火させる
      const pixelContainer = document.createElement('div');
      pixelContainer.style.display = 'none';
      pixelContainer.innerHTML = code;
      document.body.appendChild(pixelContainer);
      setPixelLoaded(true);
    } catch (err) {
      console.error('ピクセルコード挿入エラー:', err);
    }
  };

  // イベントを送信する関数
  const sendEvent = async () => {
    if (typeof window === 'undefined') return;
    
    setSending(true);
    
    try {
      if (window.ttq) {
        console.log('TikTok Pixel found, sending CompletePayment event...');
        window.ttq.track('CompletePayment');
        console.log('CompletePayment event sent successfully');
        setFinished(true);
      } else {
        console.warn('TikTok Pixel (ttq) object not found');
      }
    } catch (err) {
      console.error('イベント送信エラー:', err);
    }
  };

  // リダイレクトを実行する関数
  const performRedirect = (url) => {
    if (typeof window === 'undefined' || !url) return;
    
    try {
      window.location.href = url;
    } catch (err) {
      console.error('リダイレクトエラー:', err);
      setHasError(true);
      setError('リダイレクトできませんでした');
      setLoading(false);
    }
  };

  useEffect(() => {
    // routerやデータが読み込まれるまでは何もしない
    if (!isReady) return;

    // エラーがある場合は処理を中止
    if (serverError) {
      setHasError(true);
      setError(serverError);
      setLoading(false);
      return;
    }

    const processRedirect = async () => {
      try {
        // SSRで取得したlinkデータがある場合はそれを使用
        if (link && link.affiliate_url) {
          if (link.pixel_code) {
            insertPixelCode(link.pixel_code);
            
            // 少し待機して確実にピクセルコードが読み込まれるようにする
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // イベント送信
            await sendEvent();
            
            // さらに少し待機してからリダイレクト
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // リダイレクト実行
          performRedirect(link.affiliate_url);
        } else {
          // CSRでデータを取得
          const { id } = router.query;
          
          if (!id) {
            setHasError(true);
            setError('URLパラメータが不正です');
            setLoading(false);
            return;
          }
          
          // Supabaseからデータ取得
          const { data, error: fetchError } = await supabase
            .from('affiliate_links')
            .select('affiliate_url, pixel_code')
            .eq('id', id)
            .single();
          
          if (fetchError || !data) {
            console.error('データ取得エラー:', fetchError);
            setHasError(true);
            setError(fetchError ? fetchError.message : 'データが見つかりません');
            setLoading(false);
            return;
          }
          
          if (!data.affiliate_url) {
            setHasError(true);
            setError('リダイレクト先URLが設定されていません');
            setLoading(false);
            return;
          }
          
          // ピクセルコードの処理
          if (data.pixel_code) {
            insertPixelCode(data.pixel_code);
            
            // 少し待機して確実にピクセルコードが読み込まれるようにする
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // イベント送信
            await sendEvent();
            
            // さらに少し待機してからリダイレクト
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // リダイレクト実行
          performRedirect(data.affiliate_url);
        }
      } catch (err) {
        console.error('処理中のエラー:', err);
        setHasError(true);
        setError('予期しないエラーが発生しました');
        setLoading(false);
      }
    };
    
    processRedirect();
  }, [isReady, link, router.query, serverError]);

  return (
    <>
      <Head>
        <title>リダイレクト中...</title>
        <meta name="robots" content="noindex" />
        {/* スクリプトタグは直接挿入せず、useEffectで処理します */}
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
          <div>
            {loading && (
              <div>LOADING PIXEL TAG...</div>
            )}
            {sending && (
              <div style={{ marginTop: '10px' }}>SENDING EVENT...</div>
            )}
            {finished && (
              <div style={{ marginTop: '10px', color: 'green' }}>FINISHED</div>
            )}
            {hasError && (
              <div style={{ marginTop: '10px', color: 'red' }}>
                {error || 'ERROR'}
              </div>
            )}
          </div>
          
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #3498db', 
            borderRadius: '50%',
            margin: '20px auto',
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
      return {
        props: {
          error: 'ページが見つかりません',
          link: null
        }
      };
    }
    
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