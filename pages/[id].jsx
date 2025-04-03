import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import supabase from '../lib/supabase';

// クライアントサイドでのリダイレクト用コンポーネント
export default function RedirectPage({ id, affiliateUrl, pixelCode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const redirect = async () => {
      try {
        setLoading(true);
        
        // ピクセルコードをページに挿入
        if (pixelCode) {
          const div = document.createElement('div');
          div.innerHTML = pixelCode;
          document.head.appendChild(div);
          
          // TikTokピクセルの初期化を待機
          let attempts = 0;
          const maxAttempts = 6; // 3秒までの待機に短縮
          const waitTime = 500; // 0.5秒ごとにチェック

          while (attempts < maxAttempts) {
            if (window.ttq) {
              console.log('TikTok Pixel initialized successfully');
              break;
            }
            await new Promise(resolve => setTimeout(resolve, waitTime));
            attempts++;
          }

          if (window.ttq) {
            try {
              // CompletePaymentイベントを送信
              window.ttq.track('CompletePayment', {
                content_type: 'product_link',
                content_id: id,
                currency: 'JPY',
                value: 1
              });
              console.log('CompletePayment event sent successfully');

              // イベント送信後の待機時間を短縮（500ms）
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (eventError) {
              console.error('Error sending TikTok event:', eventError);
              // エラー時は待機せずにリダイレクト
            }
          } else {
            console.warn('TikTok Pixel not initialized after maximum attempts');
            // 初期化失敗時は待機せずにリダイレクト
          }
        }

        // リダイレクト実行
        if (affiliateUrl) {
          console.log('Redirecting to:', affiliateUrl);
          window.location.href = affiliateUrl;
        } else {
          setError('リダイレクト先URLが設定されていません。');
          setLoading(false);
        }
      } catch (err) {
        console.error('Redirect error:', err);
        setError('リダイレクト処理中にエラーが発生しました。');
        setLoading(false);
      }
    };

    redirect();
  }, [id, affiliateUrl, pixelCode]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-600 text-center">
            <h1 className="text-xl font-semibold mb-2">エラーが発生しました</h1>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">リダイレクト中...</p>
        </div>
      </div>
    </div>
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
      .maybeSingle();

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
      console.log(`ID「${id}」に該当するリンクは見つかりませんでした`);
      return {
        props: {
          error: 'リンクが見つかりません',
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