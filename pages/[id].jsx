import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import supabase from '../lib/supabase';

// すべてのコンソール出力を抑制する（TikTokアプリでのエラー表示を防ぐため）
const suppressConsoleOutput = `
  // コンソール出力を無効化
  if (typeof window !== 'undefined') {
    window.console.error = function() {};
    window.console.log = function() {};
    window.console.warn = function() {};
  }
`;

// クライアントサイドでのリダイレクト用コンポーネント
export default function RedirectPage({ link, meta, error: serverError }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(serverError);

  useEffect(() => {
    // グローバルエラーハンドラーを設定
    const handleError = (event) => {
      // エラーをキャプチャするだけで、デフォルトの処理は継続させる
      // event.preventDefault();
    };
    window.addEventListener('error', handleError);
    
    // 安全なttqチェック関数
    const isTtqAvailable = () => {
      try {
        return typeof window !== 'undefined' && 
               typeof window.ttq !== 'undefined' && 
               window.ttq !== null;
      } catch (e) {
        // エラーメッセージを出力しない
        return false;
      }
    };
    
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
        
        // ピクセルコードの処理と待機
        if (link.pixel_code) {
          // TikTokピクセル: 初期化を確認
          
          try {
            // TikTokピクセルの初期化を待機
            let attempts = 0;
            const maxAttempts = 10; // 5秒まで待機（10回 × 500ms = 5秒）
            const waitTime = 500; // 0.5秒ごとにチェック

            // ttqが利用可能になるまで待機するループ
            while (attempts < maxAttempts) {
              if (isTtqAvailable()) {
                // TikTokピクセル: 初期化確認成功
                break;
              }
              await new Promise(resolve => setTimeout(resolve, waitTime));
              attempts++;
              // TikTokピクセル: 初期化待機中...
            }

            // ttqオブジェクトが確実に初期化されているか確認
            if (isTtqAvailable()) {
              try {
                // 単純なイベント送信に修正
                window.ttq.track('CompletePayment');
                // TikTokピクセル: CompletePaymentイベント送信成功

                // イベント送信後の待機時間（3秒に短縮）
                // TikTokピクセル: イベント発火を確実にするため待機中...
                await new Promise(resolve => setTimeout(resolve, 3000));
                // TikTokピクセル: 待機完了、リダイレクトを実行します
              } catch (eventError) {
                // TikTokピクセル: イベント送信エラー - エラーメッセージを出力しない
                // エラー時でも少し待機してからリダイレクト
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } else {
              // TikTokピクセル: 初期化確認失敗 - 最大試行回数に到達 - メッセージ出力しない
              // 初期化失敗時も少し待機
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (pixelError) {
            // TikTokピクセル処理エラー - エラーメッセージを出力しない
            // エラーが発生しても処理を継続
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // 最終的なリダイレクト実行
        // リダイレクト実行メッセージ - 出力しない
        window.location.href = link.affiliate_url;
      } catch (err) {
        // リダイレクトエラー - エラーメッセージを出力しない
        setError('リダイレクト処理中にエラーが発生しました。');
        setLoading(false);
      }
    };

    // リダイレクト処理を実行
    redirect();
    
    // クリーンアップ関数
    return () => {
      window.removeEventListener('error', handleError);
    };
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
        
        {/* コンソール出力を無効化するスクリプト */}
        <script dangerouslySetInnerHTML={{ __html: suppressConsoleOutput }} />
        
        {/* ピクセルコードを安全に挿入 - try-catchを使わない */}
        {link?.pixel_code && (
          <script dangerouslySetInnerHTML={{ __html: link.pixel_code }} />
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
      // エラーメッセージを出力しない
      return {
        props: {
          error: `データ取得エラー: ${error.message}`,
          link: null,
          meta: null
        }
      };
    }

    if (!link) {
      // ID該当リンクなしメッセージ - 出力しない
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
        
        const title = getMetaContent(html, 'og:title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
        const description = getMetaContent(html, 'og:description') || getMetaContent(html, 'description') || '';
        const image = getMetaContent(html, 'og:image') || '';
        
        meta = {
          title,
          description,
          image
        };
      }
    } catch (metaError) {
      // メタデータ取得エラー - 出力しない
      // メタデータの取得に失敗しても処理は続行
    }
    
    // 正常にデータを返す
    return {
      props: {
        link,
        error: null,
        meta
      }
    };
  } catch (error) {
    // 予期しないエラー - 出力しない
    return {
      props: {
        error: 'データ取得中にエラーが発生しました',
        link: null,
        meta: null
      }
    };
  }
} 