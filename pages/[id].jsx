import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import supabase from '../lib/supabase';

// クライアントサイドでのリダイレクト用コンポーネント
export default function RedirectPage({ link, error }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(error);

  useEffect(() => {
    // データが読み込まれるまでは何もしない
    if (router.isFallback) return;

    // エラーがある場合は404ページに遷移
    if (error || !link) {
      router.push('/404');
      return;
    }

    // TikTokイベント処理とリダイレクト
    const processEvents = async () => {
      const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));
      
      // ローディング表示
      setLoading(true);
      
      // pixel_codeをDOMに直接挿入
      if (link.pixel_code) {
        try {
          // headタグへの追加に加えて、本体にも追加してイベント発火を確実にする
          const pixelContainer = document.createElement('div');
          pixelContainer.style.display = 'none';
          pixelContainer.innerHTML = link.pixel_code;
          document.body.appendChild(pixelContainer);
        } catch (err) {
          console.error('ピクセルコード挿入エラー:', err);
        }
      }
      
      // 初期待機
      await sleep(2000);
      
      // イベント送信中の表示
      setSending(true);
      
      // ttqオブジェクトの存在確認
      if (window.ttq) {
        try {
          // イベントを明示的に送信（ページ読み込み後に確実に実行）
          window.ttq.track('ClickButton');
          console.log('TikTok Pixel イベント送信成功');
          setFinished(true);
        } catch (err) {
          console.error('TikTok Pixel イベント送信エラー:', err);
          setHasError(true);
        }
      } else {
        console.error('TikTok Pixel (ttq) が見つかりません');
        setHasError(true);
      }
      
      // さらに待機してリダイレクト
      await sleep(2000);
      window.location.href = link.affiliate_url;
    };
    
    // イベント処理を開始
    processEvents();
  }, [router, link, error]);

  useEffect(() => {
    async function loadAndRedirect() {
      setLoading(true);
      
      try {
        // Supabaseからリダイレクト先URLとピクセルコードを取得
        const { data, error } = await supabase
          .from('affiliate_links')
          .select('affiliate_url, pixel_code')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('Error fetching data:', error);
          setErrorMessage('リンクが見つかりませんでした。');
          return;
        }
        
        if (!data || !data.affiliate_url) {
          setErrorMessage('リダイレクト先URLが設定されていません。');
          return;
        }
        
        // ピクセルコードをHeadに挿入
        if (data.pixel_code) {
          try {
            // ピクセルコードをBodyにも挿入して確実に発火させる
            const pixelContainer = document.createElement('div');
            pixelContainer.style.display = 'none';
            pixelContainer.innerHTML = data.pixel_code;
            document.body.appendChild(pixelContainer);
            
            // 少し待機して確実にピクセルコードが読み込まれるようにする
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // CompletePaymentイベントを発火させる
            // window.ttqオブジェクトがあるか確認してからトラッキングを実行
            if (window.ttq) {
              console.log('TikTok Pixel found, sending CompletePayment event...');
              try {
                window.ttq.track('CompletePayment');
                console.log('CompletePayment event sent successfully');
              } catch (err) {
                console.error('Error sending CompletePayment event:', err);
              }
            } else {
              console.warn('TikTok Pixel (ttq) object not found');
            }
          } catch (pixelError) {
            console.error('Error inserting pixel code:', pixelError);
          }
        }
        
        // 最終的にリダイレクト（少し待機してからリダイレクト）
        setTimeout(() => {
          window.location.href = data.affiliate_url;
        }, 1000);
        
      } catch (err) {
        console.error('Unexpected error:', err);
        setErrorMessage('予期しないエラーが発生しました。');
        setLoading(false);
      }
    }
    
    loadAndRedirect();
  }, [id, supabase]);

  return (
    <>
      <Head>
        <title>リダイレクト中...</title>
        <meta name="robots" content="noindex" />
        {/* pixel_codeをheadに挿入 */}
        {link && link.pixel_code && (
          <div dangerouslySetInnerHTML={{ __html: link.pixel_code }} />
        )}
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
            <div style={{ display: loading ? 'block' : 'none' }}>
              LOADING PIXEL TAG...
            </div>
            <div style={{ display: sending ? 'block' : 'none', marginTop: '10px' }}>
              SENDING EVENT...
            </div>
            <div style={{ display: finished ? 'block' : 'none', marginTop: '10px', color: 'green' }}>
              FINISHED
            </div>
            <div style={{ display: hasError ? 'block' : 'none', marginTop: '10px', color: 'red' }}>
              ERROR
            </div>
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