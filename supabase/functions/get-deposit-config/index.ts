// @ts-nocheck - Deno runtime file, type-checked by Deno extension not Node TS
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log('User verification failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get deposit configuration from database
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', [
        'deposit_admin_wallet',
        'deposit_chain_id',
        'deposit_min_amount',
        'deposit_conversion_rate'
      ])

    if (configError) {
      console.error('Failed to fetch deposit config:', configError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse config into object
    const config: Record<string, string> = {}
    configData?.forEach(item => {
      config[item.key] = item.value
    })

    const adminWallet = config['deposit_admin_wallet']
    const chainId = parseInt(config['deposit_chain_id'] || '8453')
    const minDeposit = config['deposit_min_amount'] || '0.00000001'
    const conversionRate = parseInt(config['deposit_conversion_rate'] || '100000000')

    if (!adminWallet || adminWallet === '0x0000000000000000000000000000000000000000') {
      console.error('Admin wallet not configured in system_config')
      return new Response(
        JSON.stringify({ error: 'Deposit system not configured. Please contact admin.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Returning deposit config for user:', user.id)

    return new Response(
      JSON.stringify({
        adminWallet,
        chainId,
        minDeposit,
        conversionRate,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in get-deposit-config:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
