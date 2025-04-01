import { createClient } from '@supabase/supabase-js';

// デバッグ用に環境変数を出力
console.log('Initializing Supabase client with:');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Key exists:', Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URLまたはAPIキーが設定されていません。.env.localファイルを確認してください。');
}

// クライアントオプションを設定
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    headers: {
      'x-application-name': 'shuffle'
    },
  },
};

const supabase = createClient(supabaseUrl || '', supabaseKey || '', options);

// インスタンス作成後に接続状態をテスト
const testConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('Supabase初期化結果:', error ? 'エラー' : '成功');
  } catch (err) {
    console.error('Supabase初期化例外:', err);
  }
};

testConnection();

export default supabase; 