// ============================================
// Supabase Edge Function: Create Razorpay Order
// Deploy: supabase functions deploy create-razorpay-order
// ============================================
// Required secrets (set via Supabase Dashboard → Edge Functions → Secrets):
//   RAZORPAY_KEY_ID
//   RAZORPAY_KEY_SECRET
//   SUPABASE_URL (auto-set)
//   SUPABASE_SERVICE_ROLE_KEY (auto-set)
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan configuration (keep in sync with frontend)
const PLANS = {
  pro_monthly:      { plan: 'pro',      period: 'monthly', amount: 19900,  interval: 1  },
  pro_annual:       { plan: 'pro',      period: 'annual',  amount: 199900, interval: 12 },
  business_monthly: { plan: 'business', period: 'monthly', amount: 49900,  interval: 1  },
  business_annual:  { plan: 'business', period: 'annual',  amount: 499900, interval: 12 },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { planId, userId } = await req.json();

    // Validate
    const planConfig = PLANS[planId];
    if (!planConfig) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan selected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: 'Razorpay credentials not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Razorpay order
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
      body: JSON.stringify({
        amount: planConfig.amount,
        currency: 'INR',
        receipt: `renteasy_${planId}_${Date.now()}`,
        notes: {
          userId,
          planId,
          plan: planConfig.plan,
          period: planConfig.period,
        },
      }),
    });

    const order = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error('Razorpay order creation failed:', order);
      return new Response(
        JSON.stringify({ error: order.error?.description || 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store order in subscription_history using service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const endsAt = planConfig.period === 'annual'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: subRecord, error: subError } = await supabaseAdmin
      .from('subscription_history')
      .insert({
        user_id: userId,
        plan_id: planId,
        plan: planConfig.plan,
        period: planConfig.period,
        amount: planConfig.amount / 100, // Store in rupees
        razorpay_order_id: order.id,
        status: 'created',
        ends_at: endsAt,
      })
      .select()
      .single();

    if (subError) {
      console.error('Failed to store subscription record:', subError);
    }

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        subscriptionId: subRecord?.id || null,
        planId,
        plan: planConfig.plan,
        period: planConfig.period,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
