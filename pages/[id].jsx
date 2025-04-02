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

  // routerが準備できたかどうかを確認
  useEffect(() => {
    if (router.isReady) {
      setIsReady(true);
    }
  }, [router.isReady]);

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

    // SSRで取得したlinkデータがある場合はそれを使用
    if (link && link.affiliate_url) {
      try {
        processWithLink(link);
      } catch (err) {
        console.error('リンク処理中のエラー:', err);
        setHasError(true);
        setError('リンク処理中にエラーが発生しました');
        setLoading(false);
      }
      return;
    }

    // CSRでデータを取得する必要がある場合
    loadAndRedirect();
  }, [isReady, serverError, link, router.query]);

  // リンクデータを使用してイベント処理とリダイレクトを行う関数
  const processWithLink = async (linkData) => {
    try {
      if (!linkData || !linkData.affiliate_url) {
        setHasError(true);
        setError('リダイレクト先URLが設定されていません');
        setLoading(false);
        return;
      }

      const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));
      
      // ピクセルコードをBodyに挿入して確実に発火させる
      if (linkData.pixel_code) {
        try {
          // コンポーネントがアンマウントされていないか確認
          const pixelContainer = document.createElement('div');
          pixelContainer.style.display = 'none';
          pixelContainer.innerHTML = linkData.pixel_code;
          document.body.appendChild(pixelContainer);
          
          // 少し待機して確実にピクセルコードが読み込まれるようにする
          await sleep(500);
          
          // イベント送信中の表示
          setSending(true);
          
          // TikTokピクセルのイベントを発火
          if (typeof window !== 'undefined' && window.ttq) {
            console.log('TikTok Pixel found, sending CompletePayment event...');
            try {
              window.ttq.track('CompletePayment');
              console.log('CompletePayment event sent successfully');
              setFinished(true);
            } catch (err) {
              console.error('Error sending CompletePayment event:', err);
              // エラーがあってもリダイレクトは継続
            }
          } else {
            console.warn('TikTok Pixel (ttq) object not found');
          }
        } catch (pixelError) {
          console.error('Error inserting pixel code:', pixelError);
          // ピクセルコードの問題があってもリダイレクトは継続
        }
      }
      
      // 最終的にリダイレクト（少し待機してからリダイレクト）
      await sleep(1000);
      
      // リダイレクト実行
      if (typeof window !== 'undefined' && linkData.affiliate_url) {
        window.location.href = linkData.affiliate_url;
      } else {
        setHasError(true);
        setError('リダイレクト先URLが無効です');
        setLoading(false);
      }
    } catch (err) {
      console.error('リンク処理中の予期しないエラー:', err);
      setHasError(true);
      setError('予期しないエラーが発生しました');
      setLoading(false);
    }
  };

  // CSRでデータを取得する関数
  const loadAndRedirect = async () => {
    try {
      setLoading(true);
      
      // idをrouterから取得
      const { id } = router.query;
      
      // idが取得できない場合は処理を中止
      if (!id) {
        setHasError(true);
        setError('URLパラメータが不正です');
        setLoading(false);
        return;
      }
      
      // Supabaseからリダイレクト先URLとピクセルコードを取得
      const { data, error: fetchError } = await supabase
        .from('affiliate_links')
        .select('affiliate_url, pixel_code')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching data:', fetchError);
        setError('リンクが見つかりませんでした');
        setHasError(true);
        setLoading(false);
        return;
      }
      
      if (!data || !data.affiliate_url) {
        setError('リダイレクト先URLが設定されていません');
        setHasError(true);
        setLoading(false);
        return;
      }
      
      // 取得したデータでリダイレクト処理
      processWithLink(data);
    } catch (err) {
      console.error('データ取得中の予期しないエラー:', err);
      setError('予期しないエラーが発生しました');
      setHasError(true);
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>リダイレクト中...</title>
        <meta name="robots" content="noindex" />
        {/* pixel_codeをheadに挿入 (条件付きでレンダリング) */}
        {link && link.pixel_code ? (
          <div dangerouslySetInnerHTML={{ __html: link.pixel_code }} />
        ) : null}
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