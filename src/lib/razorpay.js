// ============================================
// Razorpay Integration for RentEasy Subscriptions
// ============================================
import { supabase, isSupabaseConfigured } from './supabase';

// Plan pricing configuration (amounts in paise — Razorpay uses smallest currency unit)
export const RAZORPAY_PLANS = {
  pro_monthly: {
    id: 'pro_monthly',
    plan: 'pro',
    name: 'Pro — Monthly',
    amount: 19900, // ₹199 in paise
    displayPrice: '₹199',
    period: 'monthly',
    interval: 1, // months
    description: 'RentEasy Pro Plan — Monthly',
  },
  pro_annual: {
    id: 'pro_annual',
    plan: 'pro',
    name: 'Pro — Annual',
    amount: 199900, // ₹1,999 in paise (save ₹389)
    displayPrice: '₹1,999',
    period: 'annual',
    interval: 12,
    description: 'RentEasy Pro Plan — Annual (Save 17%)',
  },
  business_monthly: {
    id: 'business_monthly',
    plan: 'business',
    name: 'Business — Monthly',
    amount: 49900, // ₹499 in paise
    displayPrice: '₹499',
    period: 'monthly',
    interval: 1,
    description: 'RentEasy Business Plan — Monthly',
  },
  business_annual: {
    id: 'business_annual',
    plan: 'business',
    name: 'Business — Annual',
    amount: 499900, // ₹4,999 in paise (save ₹989)
    displayPrice: '₹4,999',
    period: 'annual',
    interval: 12,
    description: 'RentEasy Business Plan — Annual (Save 17%)',
  },
};

/**
 * Create a Razorpay order via Supabase Edge Function
 */
export async function createOrder(planId, userId) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Cannot process payments in local mode.');
  }

  const plan = RAZORPAY_PLANS[planId];
  if (!plan) throw new Error('Invalid plan selected');

  // Get current session token for auth
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: { planId, userId, amount: plan.amount },
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (error) {
    console.error('Edge function error:', error);
    // Try to extract message from FunctionsHttpError
    let errorMsg = error.message || 'Failed to create order';
    try {
      if (error.context) {
        const body = await error.context.json();
        errorMsg = body?.error || errorMsg;
      }
    } catch {}
    throw new Error(errorMsg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Open Razorpay checkout modal
 */
export function openCheckout({ orderId, amount, planName, userEmail, userName, userId, onSuccess, onFailure }) {
  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;

  if (!razorpayKeyId) {
    throw new Error('Razorpay key not configured. Add VITE_RAZORPAY_KEY_ID to your .env file.');
  }

  if (!window.Razorpay) {
    throw new Error('Razorpay SDK not loaded. Check your internet connection.');
  }

  const options = {
    key: razorpayKeyId,
    amount,
    currency: 'INR',
    name: 'RentEasy',
    description: planName,
    order_id: orderId,
    prefill: {
      name: userName || '',
      email: userEmail || '',
    },
    notes: {
      userId,
      planName,
    },
    theme: {
      color: '#6366f1',
    },
    handler: async function (response) {
      // Payment successful — verify on server
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token;

        const { data, error } = await supabase.functions.invoke('verify-razorpay-order', {
          body: {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            userId,
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        onSuccess?.(data);
      } catch (err) {
        console.error('Payment verification failed:', err);
        onFailure?.(err.message || 'Payment verification failed. Contact support.');
      }
    },
    modal: {
      ondismiss: function () {
        console.log('Razorpay checkout closed by user');
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (response) {
    console.error('Payment failed:', response.error);
    onFailure?.(response.error?.description || 'Payment failed. Please try again.');
  });
  rzp.open();
}

/**
 * Get subscription history for a user
 */
export async function getSubscriptionHistory(userId) {
  if (!isSupabaseConfigured() || !userId) return [];

  const { data, error } = await supabase
    .from('subscription_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Failed to fetch subscription history:', error.message);
    return [];
  }
  return data || [];
}
