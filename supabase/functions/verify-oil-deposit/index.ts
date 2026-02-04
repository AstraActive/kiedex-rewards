import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Conversion rate: 0.00000001 ETH = 15 Oil (i.e., 1 ETH = 1,500,000,000 Oil)
const ETH_TO_OIL_RATE = 1500000000

// Base mainnet chain ID
const BASE_CHAIN_ID = 8453

// Base mainnet RPC URL (public)
const BASE_RPC_URL = 'https://mainnet.base.org'

interface TransactionReceipt {
  status: string
  blockNumber: string
  from: string
  to: string
  value?: string
}

interface TransactionData {
  hash: string
  from: string
  to: string
  value: string
  blockNumber: string | null
}

async function getTransaction(txHash: string): Promise<TransactionData | null> {
  try {
    const response = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 1,
      }),
    })

    const data = await response.json()
    if (data.error || !data.result) {
      console.log('Transaction not found:', txHash)
      return null
    }

    return data.result
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return null
  }
}

async function getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
  try {
    const response = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      }),
    })

    const data = await response.json()
    if (data.error || !data.result) {
      console.log('Transaction receipt not found:', txHash)
      return null
    }

    return data.result
  } catch (error) {
    console.error('Error fetching transaction receipt:', error)
    return null
  }
}

function hexToEth(hexValue: string): number {
  // Convert hex wei to ETH
  const wei = BigInt(hexValue)
  return Number(wei) / 1e18
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

    // Create Supabase client with user's token for auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      console.log('JWT verification failed:', claimsError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.claims.sub as string
    console.log('Processing deposit verification for user:', userId)

    // Parse request body
    const body = await req.json()
    const { txHash, walletAddress } = body

    if (!txHash || !walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing txHash or walletAddress' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize addresses to lowercase for comparison
    const normalizedWalletAddress = walletAddress.toLowerCase()
    const normalizedTxHash = txHash.toLowerCase()

    // Get admin wallet address from environment
    const adminWallet = Deno.env.get('ADMIN_FEE_WALLET_ADDRESS')
    if (!adminWallet) {
      console.error('ADMIN_FEE_WALLET_ADDRESS not configured')
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const normalizedAdminWallet = adminWallet.toLowerCase()

    // Create service role client for database updates
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check for duplicate transaction
    const { data: existingDeposit, error: checkError } = await supabaseAdmin
      .from('oil_deposits')
      .select('id, status')
      .eq('tx_hash', normalizedTxHash)
      .single()

    if (existingDeposit) {
      console.log('Duplicate transaction detected:', normalizedTxHash, 'Status:', existingDeposit.status)
      if (existingDeposit.status === 'confirmed') {
        return new Response(
          JSON.stringify({ error: 'Transaction already processed', status: 'duplicate' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // If pending, continue with verification
    }

    // Fetch transaction from Base network
    console.log('Fetching transaction from Base network:', normalizedTxHash)
    const tx = await getTransaction(normalizedTxHash)

    if (!tx) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found on Base network' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify transaction is confirmed (has block number)
    if (!tx.blockNumber) {
      console.log('Transaction not yet confirmed:', normalizedTxHash)
      return new Response(
        JSON.stringify({ error: 'Transaction not yet confirmed', status: 'pending' }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get receipt to verify success
    const receipt = await getTransactionReceipt(normalizedTxHash)
    if (!receipt || receipt.status !== '0x1') {
      console.log('Transaction failed or receipt not found:', normalizedTxHash)
      return new Response(
        JSON.stringify({ error: 'Transaction failed or reverted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify recipient is admin wallet
    if (tx.to?.toLowerCase() !== normalizedAdminWallet) {
      console.log('Invalid recipient. Expected:', normalizedAdminWallet, 'Got:', tx.to?.toLowerCase())
      return new Response(
        JSON.stringify({ error: 'Invalid transaction recipient' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify sender is user's wallet
    if (tx.from?.toLowerCase() !== normalizedWalletAddress) {
      console.log('Invalid sender. Expected:', normalizedWalletAddress, 'Got:', tx.from?.toLowerCase())
      return new Response(
        JSON.stringify({ error: 'Transaction sender does not match wallet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate ETH amount and Oil credits
    const ethAmount = hexToEth(tx.value)
    if (ethAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Transaction has no value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const oilCredited = Math.floor(ethAmount * ETH_TO_OIL_RATE)
    console.log(`Verified deposit: ${ethAmount} ETH = ${oilCredited} Oil for user ${userId}`)

    // Insert or update deposit record
    if (existingDeposit) {
      // Update existing pending deposit
      const { error: updateError } = await supabaseAdmin
        .from('oil_deposits')
        .update({
          status: 'confirmed',
          eth_amount: ethAmount,
          oil_credited: oilCredited,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', existingDeposit.id)

      if (updateError) {
        console.error('Failed to update deposit:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update deposit record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Insert new confirmed deposit
      const { error: insertError } = await supabaseAdmin
        .from('oil_deposits')
        .insert({
          user_id: userId,
          wallet_address: normalizedWalletAddress,
          tx_hash: normalizedTxHash,
          eth_amount: ethAmount,
          oil_credited: oilCredited,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Failed to insert deposit:', insertError)
        // Check if it's a duplicate key error
        if (insertError.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'Transaction already processed', status: 'duplicate' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({ error: 'Failed to record deposit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Update user's oil balance
    const { data: currentBalance, error: balanceError } = await supabaseAdmin
      .from('balances')
      .select('oil_balance')
      .eq('user_id', userId)
      .single()

    if (balanceError) {
      console.error('Failed to get current balance:', balanceError)
      return new Response(
        JSON.stringify({ error: 'Failed to get current balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newOilBalance = (currentBalance?.oil_balance || 0) + oilCredited

    const { error: updateBalanceError } = await supabaseAdmin
      .from('balances')
      .update({ oil_balance: newOilBalance })
      .eq('user_id', userId)

    if (updateBalanceError) {
      console.error('Failed to update oil balance:', updateBalanceError)
      return new Response(
        JSON.stringify({ error: 'Failed to update oil balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully credited ${oilCredited} Oil to user ${userId}. New balance: ${newOilBalance}`)

    return new Response(
      JSON.stringify({
        success: true,
        ethAmount,
        oilCredited,
        newBalance: newOilBalance,
        txHash: normalizedTxHash,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in verify-oil-deposit:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
