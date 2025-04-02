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

    // トラッキングコードが実行される時間を待ってからリダイレクト
    const sendEvent = async () => {
      const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));
      
      // 2秒待機してイベントを送信
      await sleep(2000);
      
      if (window.ttq) {
        try {
          // ClickButtonイベントを送信
          window.ttq.track('ClickButton');
          console.log('TikTok Pixel イベント送信成功');
        } catch (err) {
          console.error('TikTok Pixel イベント送信エラー:', err);
        }
      } else {
        console.error('TikTok Pixel (ttq) が見つかりません');
      }
      
      // さらに1秒待機してリダイレクト
      await sleep(1000);
      window.location.href = link.affiliate_url;
    };
    
    // イベント送信とリダイレクト処理を開始
    sendEvent();
  }, [router, link, error]);

  // ページ全体のマークアップと埋め込みスクリプト
  return (
    <>
      <Head>
        <title>リダイレクト中...</title>
        <meta name="robots" content="noindex" />
        {link && link.pixel_id && (
          <script dangerouslySetInnerHTML={{
            __html: `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};

                ttq.load('${link.pixel_id}');
                ttq.page();
              }(window, document, 'ttq');
            `
          }} />
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