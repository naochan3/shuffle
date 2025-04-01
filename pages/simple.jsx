import React from 'react';

export default function SimplePage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>シンプルテストページ</h1>
      <p>このページが表示されれば、ReactとNext.jsは正常に動作しています。</p>
      <div style={{ marginTop: '30px' }}>
        <a 
          href="/" 
          style={{ 
            display: 'inline-block', 
            padding: '10px 15px', 
            background: '#4299e1', 
            color: 'white', 
            borderRadius: '5px', 
            textDecoration: 'none' 
          }}
        >
          ホームに戻る
        </a>
      </div>
    </div>
  );
} 