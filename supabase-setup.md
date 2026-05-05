# Supabase 一括設定用 SQL (フォロー承認制・安全上書き版)

以下の SQL を Supabase の **SQL Editor** に貼り付けて実行してください。
既存の設定を一度クリアしてから最新の承認制ポリシーを再適用するため、エラーなく一括実行できます。

```sql
-- ==========================================
-- 1. profiles テーブル（ユーザー検索用）
-- ==========================================
create table if not exists profiles (
  id uuid references auth.users(id) primary key,
  email text not null
);

-- 既存ユーザーのコピー
insert into profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- 閲覧ポリシー
alter table profiles enable row level security;
drop policy if exists "Profiles are viewable by everyone" on profiles;
create policy "Profiles are viewable by everyone" on profiles for select using (true);


-- ==========================================
-- 2. follows テーブル（承認制対応・カラム追加）
-- ==========================================
create table if not exists follows (
  follower_id uuid references auth.users(id) not null,
  following_id uuid references auth.users(id) not null,
  status text default 'pending',
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- 既存テーブルがある場合、statusカラムを安全に追加
alter table follows add column if not exists status text default 'pending';

-- リレーションの明示的な設定
alter table follows drop constraint if exists follows_following_id_fkey;
alter table follows add constraint follows_following_id_fkey foreign key (following_id) references profiles(id);

alter table follows drop constraint if exists follows_follower_id_fkey;
alter table follows add constraint follows_follower_id_fkey foreign key (follower_id) references profiles(id);

-- 既存のポリシーをすべてクリーンアップ
drop policy if exists "Allow users to see their own following list" on follows;
drop policy if exists "Allow users to see their follows" on follows;
drop policy if exists "Allow users to follow others" on follows;
drop policy if exists "Allow users to unfollow or reject" on follows;
drop policy if exists "Allow users to accept follows" on follows;

-- 自分が関わっているフォロー情報のみ閲覧可能
create policy "Allow users to see their follows" on follows for select 
using (auth.uid() = follower_id or auth.uid() = following_id);

-- フォロー申請
create policy "Allow users to follow others" on follows for insert 
with check (auth.uid() = follower_id);

-- フォロー解除・拒否
create policy "Allow users to unfollow or reject" on follows for delete 
using (auth.uid() = follower_id or auth.uid() = following_id);

-- フォロー承認（自分がフォローされる側のみ）
create policy "Allow users to accept follows" on follows for update 
using (auth.uid() = following_id)
with check (status = 'accepted');


-- ==========================================
-- 3. subjects テーブル
-- ==========================================
alter table subjects enable row level security;
drop policy if exists "Manage own subjects" on subjects;
drop policy if exists "Allow everyone to see subject info" on subjects;

create policy "Manage own subjects" on subjects for all using (auth.uid() = user_id);
create policy "Allow everyone to see subject info" on subjects for select using (true);


-- ==========================================
-- 4. study_logs テーブル
-- ==========================================
alter table study_logs enable row level security;
drop policy if exists "Allow viewing followed logs" on study_logs;
drop policy if exists "Allow users to insert their own logs" on study_logs;
drop policy if exists "Allow users to delete their own logs" on study_logs;
drop policy if exists "Users can view their own logs" on study_logs;
drop policy if exists "Users can insert their own logs" on study_logs;

-- 自分または承認された友達のログを閲覧
create policy "Allow viewing followed logs" on study_logs for select 
using (
  auth.uid() = user_id or 
  exists (
    select 1 from follows 
    where follower_id = auth.uid() 
    and following_id = study_logs.user_id 
    and status = 'accepted'
  )
);

create policy "Allow users to insert their own logs" on study_logs for insert with check (auth.uid() = user_id);
create policy "Allow users to delete their own logs" on study_logs for delete using (auth.uid() = user_id);


-- ==========================================
-- 5. Storage (画像ファイル)
-- ==========================================
drop policy if exists "Public Access to Subject Images" on storage.objects;
drop policy if exists "Allow authenticated uploads" on storage.objects;

create policy "Public Access to Subject Images" on storage.objects for select to public using (bucket_id = 'subject-images');
create policy "Allow authenticated uploads" on storage.objects for insert to authenticated with check (bucket_id = 'subject-images');
```
