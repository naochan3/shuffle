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

  useEffect(() => {
    // データが読み込まれるまでは何もしない
    if (router.isFallback) return;

    // エラーがある場合は404ページに遷移
    if (serverError) {
      router.push('/404');
      return;
    }

    // SSRで取得したlinkデータがある場合はそれを使用
    if (link && link.affiliate_url) {
      processWithLink(link);
      return;
    }

    // CSRでデータを取得する必要がある場合
    async function loadAndRedirect() {
      setLoading(true);
      
      try {
        // idをrouterから取得
        const { id } = router.query;
        
        // idが取得できるまで待機
        if (!id) return;
        
        // Supabaseからリダイレクト先URLとピクセルコードを取得
        const { data, error: fetchError } = await supabase
          .from('affiliate_links')
          .select('affiliate_url, pixel_code')
          .eq('id', id)
          .single();
        
        if (fetchError) {
          console.error('Error fetching data:', fetchError);
          setError('リンクが見つかりませんでした。');
          setHasError(true);
          setLoading(false);
          return;
        }
        
        if (!data || !data.affiliate_url) {
          setError('リダイレクト先URLが設定されていません。');
          setHasError(true);
          setLoading(false);
          return;
        }
        
        // 取得したデータでリダイレクト処理
        processWithLink(data);
        
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('予期しないエラーが発生しました。');
        setHasError(true);
        setLoading(false);
      }
    }
    
    // リンクデータを使用してイベント処理とリダイレクトを行う関数
    async function processWithLink(linkData) {
      const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));
      
      // ピクセルコードをBodyに挿入して確実に発火させる
      if (linkData.pixel_code) {
        try {
          const pixelContainer = document.createElement('div');
          pixelContainer.style.display = 'none';
          pixelContainer.innerHTML = linkData.pixel_code;
          document.body.appendChild(pixelContainer);
          
          // 少し待機して確実にピクセルコードが読み込まれるようにする
          await sleep(500);
          
          // イベント送信中の表示
          setSending(true);
          
          // TikTokピクセルのイベントを発火
          if (window.ttq) {
            console.log('TikTok Pixel found, sending CompletePayment event...');
            try {
              window.ttq.track('CompletePayment');
              console.log('CompletePayment event sent successfully');
              setFinished(true);
            } catch (err) {
              console.error('Error sending CompletePayment event:', err);
              setHasError(true);
            }
          } else {
            console.warn('TikTok Pixel (ttq) object not found');
            setHasError(true);
          }
        } catch (pixelError) {
          console.error('Error inserting pixel code:', pixelError);
          setHasError(true);
        }
      }
      
      // 最終的にリダイレクト（少し待機してからリダイレクト）
      await sleep(2000);
      window.location.href = linkData.affiliate_url;
    }
    
    loadAndRedirect();
  }, [router, serverError, link]);

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
              {error || 'ERROR'}
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