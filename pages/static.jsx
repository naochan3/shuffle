import React from 'react';
import Head from 'next/head';

// 静的生成を使用
export async function getStaticProps() {
  return {
    props: {
      time: new Date().toISOString(),
    },
  };
}

export default function StaticPage({ time }) {
  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '800px', 
      margin: '0 auto', 
      fontFamily: 'sans-serif' 
    }}>
      <Head>
        <title>静的ページ</title>
      </Head>
      
      <h1 style={{ fontSize: '28px', marginBottom: '24px', textAlign: 'center' }}>
        完全な静的ページ
      </h1>
      
      <div style={{ 
        backgroundColor: 'white', 
        padding: '24px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <p style={{ marginBottom: '16px' }}>
          このページは静的生成（Static Generation）を使用しており、ビルド時に生成されます。
          Supabaseとの接続は必要なく、常に表示されるはずです。
        </p>
        
        <p style={{ 
          padding: '12px', 
          backgroundColor: '#f7fafc', 
          borderRadius: '4px', 
          fontFamily: 'monospace' 
        }}>
          ビルド時刻: {time}
        </p>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <a 
          href="/simple" 
          style={{ 
            padding: '10px 16px', 
            backgroundColor: '#4299e1', 
            color: 'white', 
            borderRadius: '4px', 
            textDecoration: 'none' 
          }}
        >
          シンプルページ
        </a>
        
        <a 
          href="/error" 
          style={{ 
            padding: '10px 16px', 
            backgroundColor: '#f56565', 
            color: 'white', 
            borderRadius: '4px', 
            textDecoration: 'none' 
          }}
        >
          エラーページ
        </a>
        
        <a 
          href="/" 
          style={{ 
            padding: '10px 16px', 
            backgroundColor: '#718096', 
            color: 'white', 
            borderRadius: '4px', 
            textDecoration: 'none' 
          }}
        >
          ホームに戻る
        </a>
      </div>
    </div>
  );
} 