import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import supabase from '../lib/supabase';

// クライアントサイドでのリダイレクト用コンポーネント
export default function RedirectPage({ link, meta, error: serverError }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(serverError);

  useEffect(() => {
    const redirect = async () => {
      try {
        setLoading(true);

        // サーバーサイドでエラーが発生している場合は処理を中止
        if (serverError) {
          setError(serverError);
          setLoading(false);
          return;
        }

        // リンクデータが存在しない場合
        if (!link || !link.affiliate_url) {
          setError('リダイレクト先URLが見つかりません。');
          setLoading(false);
          return;
        }
        
        // ピクセルコードの処理と待機（既にHEADに挿入済みのため、初期化確認と補完のみ）
        if (link.pixel_code) {
          console.log('TikTokピクセル: 初期化を確認');
          
          // TikTokピクセルの初期化を待機
          let attempts = 0;
          const maxAttempts = 20; // 10秒まで待機（20回 × 500ms = 10秒）
          const waitTime = 500; // 0.5秒ごとにチェック

          while (attempts < maxAttempts) {
            if (window.ttq) {
              console.log(`TikTokピクセル: 初期化確認成功 (${attempts + 1}回目の試行)`);
              break;
            }
            await new Promise(resolve => setTimeout(resolve, waitTime));
            attempts++;
            console.log(`TikTokピクセル: 初期化待機中... (${attempts}/${maxAttempts})`);
          }

          // ttqオブジェクトが確実に初期化されているか確認
          if (window.ttq) {
            try {
              // CompletePaymentイベントがピクセルコードに含まれていない場合のみ、明示的に送信
              if (!link.pixel_code.includes('ttq.track(\'CompletePayment\'') && 
                  !link.pixel_code.includes('"CompletePayment"') && 
                  !link.pixel_code.includes('event=complete payment') && 
                  !link.pixel_code.includes('event=CompletePayment')) {
                // CompletePaymentイベントを送信（フォーマットを最適化）
                window.ttq.track('CompletePayment', {
                  contents: [{
                    content_id: link.id,
                    content_type: 'product_link',
                    content_name: 'Product Link'
                  }],
                  value: 1,
                  currency: 'JPY'
                });
                console.log('TikTokピクセル: 追加のCompletePaymentイベント送信成功');
              } else {
                console.log('TikTokピクセル: CompletePaymentイベントは既に含まれています');
              }

              // イベント送信後の待機時間（5000ms = 5秒に延長）
              console.log('TikTokピクセル: イベント発火を確実にするため待機中... (5秒)');
              await new Promise(resolve => setTimeout(resolve, 5000));
              console.log('TikTokピクセル: 待機完了、リダイレクトを実行します');
            } catch (eventError) {
              console.error('TikTokピクセル: イベント送信エラー', eventError);
              // エラー時でも少し待機してからリダイレクト
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } else {
            console.warn('TikTokピクセル: 初期化確認失敗 - 最大試行回数に到達');
            // 初期化失敗時も少し待機
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // リダイレクト実行
        console.log('リダイレクト実行:', link.affiliate_url);
        window.location.href = link.affiliate_url;
      } catch (err) {
        console.error('リダイレクトエラー:', err);
        setError('リダイレクト処理中にエラーが発生しました。');
        setLoading(false);
      }
    };

    redirect();
  }, [link, serverError]);

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
      <Head>
        <title>{meta?.title || 'リダイレクト中...'}</title>
        <meta name="description" content={meta?.description || 'ページ移動中です。少々お待ちください。'} />
        <meta name="robots" content="noindex" />
        {/* TikTok用のページレベルメタデータを追加 */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={meta?.title || 'Product Page'} />
        <meta property="og:description" content={meta?.description || 'Product Description'} />
        {meta?.image && <meta property="og:image" content={meta.image} />}
        <meta property="product:price:amount" content="1000" />
        <meta property="product:price:currency" content="JPY" />
        
        {/* ピクセルコードを直接<head>タグ内に挿入 */}
        {link?.pixel_code && (
          <div dangerouslySetInnerHTML={{ __html: link.pixel_code }} />
        )}
      </Head>
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">リダイレクト中...</p>
          {meta?.title && (
            <p className="mt-2 text-sm text-gray-500">{meta.title}</p>
          )}
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
    const { data: link, error } = await supabase
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

    if (!link) {
      console.log(`ID「${id}」に該当するリンクは見つかりませんでした`);
      return {
        props: {
          error: 'リンクが見つかりません',
          link: null,
          meta: null
        }
      };
    }

    // アフィリエイトURLが設定されていない場合
    if (!link.affiliate_url) {
      return {
        props: {
          error: 'リダイレクト先URLが設定されていません',
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
      const response = await fetch(link.affiliate_url, {
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
        link,
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