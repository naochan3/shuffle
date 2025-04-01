import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import supabase from '../lib/supabase';

export default function RedirectPage({ link, error }) {
  const router = useRouter();

  useEffect(() => {
    // クライアントサイドでのデバッグ情報
    if (error) {
      console.error('エラー情報:', error);
    }
  }, [error]);

  if (router.isFallback) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">読み込み中...</p>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Head>
          <title>ページが見つかりません</title>
        </Head>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
          <p className="text-gray-600 mb-8">お探しのページは存在しないか、削除された可能性があります。</p>
          <Link href="/" className="text-blue-600 hover:underline">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>商品情報</title>
        <meta name="description" content="商品詳細情報" />
      </Head>
      
      {/* TikTok Pixelコードを埋め込み */}
      {link.pixel_code && (
        <div dangerouslySetInnerHTML={{ __html: link.pixel_code }} />
      )}

      <main className="container mx-auto py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">商品情報</h1>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="mb-6 text-lg">
              このページでは特別な商品情報をご紹介しています。詳しい内容を確認するには以下のリンクをクリックしてください。
            </p>
            
            <div className="flex justify-center">
              <a
                href={link.affiliate_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-200"
              >
                商品の詳細を見る
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const { id } = params;
  
  // パラメータチェック
  if (!id) {
    return {
      props: {
        error: 'IDが指定されていません',
        link: null,
      }
    };
  }

  try {
    console.log('Supabaseに接続...');
    console.log('ID:', id);
    
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