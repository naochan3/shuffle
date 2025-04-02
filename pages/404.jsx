import Head from 'next/head';
import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Head>
        <title>ページが見つかりません | Shuffle</title>
        <meta name="description" content="お探しのページは見つかりませんでした。" />
      </Head>
      
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-medium text-gray-700 mb-6">ページが見つかりません</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          お探しのページは存在しないか、削除された可能性があります。
        </p>
        
        <Link href="/" className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-200">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
} 