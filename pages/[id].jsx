import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import supabase from '../lib/supabase';

// クライアントサイドでのリダイレクト用コンポーネント
export default function RedirectPage({ link, meta, error: serverError }) {
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
          
          // リダイレクト実行 - すぐにリダイレクト
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
        <title>{meta?.title || '商品ページへリダイレクト中...'}</title>
        <meta name="description" content={meta?.description || 'こちらの商品ページにリダイレクトします。少々お待ちください。'} />
        <meta name="robots" content="noindex" />
        
        {/* OGP設定 - SNSでの表示用 */}
        <meta property="og:title" content={meta?.title || '商品ページへ移動中...'} />
        <meta property="og:description" content={meta?.description || 'こちらの商品ページにリダイレクトします。少々お待ちください。'} />
        <meta property="og:type" content="website" />
        {meta?.image && <meta property="og:image" content={meta.image} />}
        
        {/* Twitter Card設定 */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta?.title || '商品ページへ移動中...'} />
        <meta name="twitter:description" content={meta?.description || 'こちらの商品ページにリダイレクトします。少々お待ちください。'} />
        {meta?.image && <meta name="twitter:image" content={meta.image} />}
        
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
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {meta?.image && (
            <div style={{ margin: '0 auto 20px', maxWidth: '300px' }}>
              <img 
                src={meta.image} 
                alt={meta.title || '商品画像'} 
                style={{ 
                  width: '100%', 
                  height: 'auto', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }} 
              />
            </div>
          )}
          
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            margin: '0 0 10px',
            color: '#333'
          }}>
            {meta?.title || '商品ページへ移動中...'}
          </h1>
          
          {meta?.description && (
            <p style={{ 
              fontSize: '1rem',
              color: '#666',
              margin: '0 0 20px'
            }}>
              {meta.description}
            </p>
          )}
          
          <div>
            {loading && (
              <div style={{ color: '#666', fontSize: '0.875rem' }}>ページ移動の準備中...</div>
            )}
          </div>
          
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #3498db', 
            borderRadius: '50%',
            margin: '15px auto',
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
        meta: null
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
          link: null,
          meta: null
        }
      };
    }

    if (!data) {
      return {
        props: {
          error: 'ページが見つかりません',
          link: null,
          meta: null
        }
      };
    }
    
    // アフィリエイトURLからメタデータを取得する
    let meta = null;
    
    try {
      // Node-fetchを使用してURLの内容を取得
      const fetch = require('node-fetch');
      const response = await fetch(data.affiliate_url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 5000 // 5秒でタイムアウト
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // メタタグからタイトルと説明を抽出
        const getMetaContent = (html, name) => {
          const metaMatch = html.match(new RegExp(`<meta\\s+(name|property)=["']${name}["']\\s+content=["']([^"']+)["']`, 'i')) 
                        || html.match(new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(name|property)=["']${name}["']`, 'i'));
          return metaMatch ? metaMatch[2] || metaMatch[1] : null;
        };
        
        // タイトルの取得 (OGPやtitleタグから)
        let title = getMetaContent(html, 'og:title');
        if (!title) {
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          title = titleMatch ? titleMatch[1] : null;
        }
        
        // 説明の取得
        const description = getMetaContent(html, 'og:description') || 
                            getMetaContent(html, 'description');
        
        // 画像の取得
        const image = getMetaContent(html, 'og:image');
        
        meta = {
          title: title || null,
          description: description || null,
          image: image || null
        };
      }
    } catch (metaError) {
      console.error('メタデータ取得エラー:', metaError);
      // メタデータ取得エラーは無視してデフォルト表示にする
    }
    
    return {
      props: {
        link: data,
        meta: meta || null,
        error: null
      }
    };
  } catch (error) {
    console.error('予期しないエラー:', error);
    
    return {
      props: {
        error: `予期しないエラー: ${error.message || '不明なエラー'}`,
        link: null,
        meta: null
      }
    };
  }
} 