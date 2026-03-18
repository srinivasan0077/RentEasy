// ============================================
// Supabase Edge Function: Verify Razorpay Payment
// Deploy: supabase functions deploy verify-razorpay-payment
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required payment verification fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature: HMAC SHA256 of (order_id + "|" + payment_id) with key_secret
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = createHmac('sha256', razorpayKeySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature mismatch!', { expected: expectedSignature, received: razorpay_signature });
      return new Response(
        JSON.stringify({ error: 'Payment verification failed — invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Signature is valid — activate subscription
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find the subscription record by order ID
    const { data: subRecord, error: fetchError } = await supabaseAdmin
      .from('subscription_history')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !subRecord) {
      console.error('Subscription record not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Subscription record not found for this order' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the activate_subscription function
    const { data: activationResult, error: activationError } = await supabaseAdmin
      .rpc('activate_subscription', {
        p_user_id: userId,
        p_subscription_id: subRecord.id,
        p_plan: subRecord.plan,
        p_period: subRecord.period,
        p_razorpay_payment_id: razorpay_payment_id,
        p_razorpay_signature: razorpay_signature,
      });

    if (activationError) {
      console.error('Activation failed:', activationError);
      return new Response(
        JSON.stringify({ error: 'Failed to activate subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (activationResult?.error) {
      return new Response(
        JSON.stringify({ error: activationResult.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan: subRecord.plan,
        period: subRecord.period,
        message: `Successfully upgraded to ${subRecord.plan} plan!`,
        ...activationResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Verification error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
