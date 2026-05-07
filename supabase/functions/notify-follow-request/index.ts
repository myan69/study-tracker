import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.6'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

webpush.setVapidDetails(
  'mailto:example@yourdomain.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const { record } = payload // followsテーブルの新しいレコード
    
    // 1. 通知を送る相手（following_id）の購読情報を取得
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', record.following_id)

    if (error || !subs) throw error

    // 2. 申請者の名前を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', record.follower_id)
      .single()

    const name = profile?.username || profile?.email || '誰か'

    // 3. 各デバイスに通知を送信
    const pushPayload = JSON.stringify({
      title: '新しいフォローリクエスト',
      body: `${name} さんからフォローリクエストが届きました！`
    })

    const results = await Promise.all(subs.map(sub => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }
      return webpush.sendNotification(pushConfig, pushPayload)
    }))

    return new Response(JSON.stringify({ success: true, count: results.length }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
