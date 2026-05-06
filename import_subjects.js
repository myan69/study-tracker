import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

const books = [
  { name: '英単語ターゲット1900', image_url: 'https://m.media-amazon.com/images/I/71R2H2rF0OL._AC_UF1000,1000_QL80_.jpg', color: '#ff6b6b' },
  { name: 'チャート式基礎からの数学I+A', image_url: 'https://m.media-amazon.com/images/I/81Pz-x3t6aL._AC_UF1000,1000_QL80_.jpg', color: '#fcc419' },
  { name: 'システム英単語', image_url: 'https://m.media-amazon.com/images/I/81lS5-u1kBL._AC_UF1000,1000_QL80_.jpg', color: '#339af0' },
  { name: '全レベル問題集英語長文', image_url: 'https://m.media-amazon.com/images/I/719hQjQ4Z5L._AC_UF1000,1000_QL80_.jpg', color: '#51cf66' },
  { name: '国公立標準問題集CanPass数学', image_url: 'https://m.media-amazon.com/images/I/81dG1xY-9yL._AC_UF1000,1000_QL80_.jpg', color: '#9775fa' }
];

async function importBooks() {
  try {
    const { data: users, error: userError } = await supabase.from('subjects').select('user_id').limit(1);
    if (userError) throw userError;

    const userId = users.length > 0 ? users[0].user_id : null;
    if (!userId) {
      console.error('ユーザーIDが見つかりませんでした。');
      return;
    }

    const booksToInsert = books.map(book => ({ ...book, user_id: userId }));

    const { error } = await supabase.from('subjects').insert(booksToInsert);
    if (error) throw error;

    console.log('参考書のインポートが完了しました。');
    console.table(books);
  } catch (error) {
    console.error('インポートエラー:', error.message);
  }
}

importBooks();
