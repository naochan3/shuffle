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

    // ピクセルコードの読み込み（トラッキング）
    if (link.pixel_code) {
      try {
        const pixelScript = document.createElement('div');
        pixelScript.innerHTML = link.pixel_code;
        document.head.appendChild(pixelScript);
        
        // TikTokのttclidを取得（URLから）
        const ttclid = new URLSearchParams(window.location.search).get('ttclid');
        
        // 修正されたURLを使用
        let finalUrl = link.modified_url;
        if (ttclid) {
          // ttclidプレースホルダーを実際の値に置換
          finalUrl = finalUrl.replace('${ttclid}', ttclid);
        }
        
        // トラッキングコードが実行される時間を少し待ってからリダイレクト
        setTimeout(() => {
          window.location.href = finalUrl;
        }, 300);
      } catch (err) {
        console.error('ピクセルコード実行エラー:', err);
        // エラーが発生しても最終的にはリダイレクト
        window.location.href = link.affiliate_url;
      }
    } else {
      // ピクセルコードがない場合は直接リダイレクト
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