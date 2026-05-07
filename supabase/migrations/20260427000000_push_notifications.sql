-- 1. push_subscriptions テーブルの作成
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, endpoint)
);

-- RLSの有効化
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ポリシーの設定
CREATE POLICY "Users can manage their own subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id);

-- 2. follows テーブルの INSERT 時に Edge Function を呼ぶための設定
-- pg_net 拡張機能が有効であることを確認
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 通知用トリガー関数の作成
CREATE OR REPLACE FUNCTION public.notify_follow_request_webhook()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://mvbclgoqqbmvtkhgksnh.supabase.co/functions/v1/notify-follow-request',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの作成 (すでに存在する場合は削除してから作成)
DROP TRIGGER IF EXISTS on_follow_created ON public.follows;
CREATE TRIGGER on_follow_created
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_follow_request_webhook();
