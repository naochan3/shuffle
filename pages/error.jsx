export default function ErrorPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center',
      fontFamily: 'sans-serif',
      backgroundColor: '#f7fafc'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '16px', color: '#2d3748' }}>
        静的エラーページ
      </h1>
      <p style={{ fontSize: '18px', marginBottom: '24px', color: '#4a5568' }}>
        このページが表示されれば、Next.jsの基本機能は動作しています。
      </p>
      <div>
        <a 
          href="/simple" 
          style={{ 
            display: 'inline-block', 
            padding: '12px 24px', 
            backgroundColor: '#4299e1', 
            color: 'white', 
            borderRadius: '6px', 
            textDecoration: 'none',
            marginRight: '12px'
          }}
        >
          シンプルページへ
        </a>
        <a 
          href="/" 
          style={{ 
            display: 'inline-block', 
            padding: '12px 24px', 
            backgroundColor: '#718096', 
            color: 'white', 
            borderRadius: '6px', 
            textDecoration: 'none' 
          }}
        >
          ホームへ戻る
        </a>
      </div>
    </div>
  );
} 