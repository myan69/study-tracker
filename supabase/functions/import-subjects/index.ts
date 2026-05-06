import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const subjects = [
    { name: '数学I・A 入門問題精講', category: '数学' },
    { name: '英語長文ハイパートレーニング レベル2', category: '英語' },
    { name: '物理のエッセンス 力学・波動', category: '物理' },
    { name: '化学の新演習', category: '化学' },
    { name: '古文単語315', category: '古文' },
  ]

  const { data, error } = await supabaseClient
    .from('subjects')
    .upsert(subjects, { onConflict: 'name' })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  return new Response(JSON.stringify({ data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
})
