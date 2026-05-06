import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const books = [
  { name: 'システム英単語', color: '#da200e' },
  { name: '数学I・A基礎問題精講', color: '#da9a0e' },
  { name: '物理のエッセンス', color: '#9fda0e' },
  { name: '化学の新演習', color: '#25da0e' },
  { name: '古文単語315', color: '#0eda72' }
];

async function seed() {
  const { error } = await supabase.from('subjects').insert(books);
  if (error) console.error('Error seeding:', error);
  else console.log('Successfully seeded subjects');
}

seed();
