-- 1. subjects テーブルから user_id カラムを削除
ALTER TABLE subjects DROP COLUMN IF EXISTS user_id;

-- 2. RLSポリシーの更新
DROP POLICY IF EXISTS "Users can view their own subjects" ON subjects;
CREATE POLICY "Anyone can view subjects" ON subjects FOR SELECT USING (true);
