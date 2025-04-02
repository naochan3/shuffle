import { useRouter } from 'next/router';
import { useEffect } from 'react';
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

    // TikTok ピクセルコードの設定（埋め込み）
    if (link.pixel_id) {
      try {
        // TikTok Pixel Base Code
        !function (w, d, t) {
          w.TiktokOnEvent = function() {
            var arg = Array.prototype.slice.call(arguments);
            (w.ttq || (w.ttq = [])).push(arg);
          };
          var s = d.createElement(t);
          s.async = true;
          s.src = 'https://analytics.tiktok.com/i18n/pixel/events.js';
          var n = d.getElementsByTagName(t)[0];
          n.parentNode.insertBefore(s, n);
        }(window, document, 'script');

        // ピクセルIDを設定
        window.ttq = window.ttq || [];
        window.ttq.push(['init', link.pixel_id]);

        // Purchase イベント（価格情報がある場合）
        if (link.value) {
          window.ttq.push([
            'track',
            'Purchase',
            {
              content_type: 'product',
              content_id: link.id,
              content_name: link.id,
              quantity: 1,
              price: link.value,
              value: link.value,
              currency: 'JPY',
            },
          ]);
        } else {
          // 価格情報がない場合は ClickButton イベント
          window.ttq.push(['track', 'ClickButton']);
        }
        
        // トラッキングコードが実行される時間を少し待ってからリダイレクト
        setTimeout(() => {
          window.location.href = link.affiliate_url;
        }, 500);
      } catch (err) {
        console.error('ピクセルコード実行エラー:', err);
        // エラーが発生しても最終的にはリダイレクト
        window.location.href = link.affiliate_url;
      }
    } else {
      // ピクセルIDがない場合は直接リダイレクト
      window.location.href = link.affiliate_url;
    }
  }, [router, link, error]);

  // ローディング画面（ほぼ表示されない）
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: '#f7fafc'
    }}>
      <div style={{ textAlign: 'center' }}>
        <p>リダイレクト中...</p>
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