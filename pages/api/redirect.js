import supabase from '../../lib/supabase';

// 簡易リダイレクトAPI
export default async function redirectApi(req, res) {
  // IDを取得
  const { id } = req.query;
  if (!id) return res.redirect('/');
  
  try {
    // Supabaseからリダイレクト先を取得
    const { data } = await supabase
      .from('affiliate_links')
      .select('affiliate_url')
      .eq('id', id)
      .maybeSingle();
    
    // リダイレクト実行
    if (data?.affiliate_url) {
      return res.redirect(data.affiliate_url);
    } else {
      return res.redirect('/');
    }
  } catch (e) {
    console.error('リダイレクトエラー:', e);
    return res.redirect('/');
  }
}