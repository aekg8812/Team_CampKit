import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData = await req.json()

    // 👇 ここにステップ2でコピーしたGASのURLを貼り付ける！
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbxdu9Eg9jBVUTY-PkSYulCS1Ps_Qp6oQ_cfnCqaLb7gUi4KHmynMrARTmTZIkxUO7YR6w/exec'

    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(requestData)
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})