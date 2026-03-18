-- ============================================
-- RentEasy Schema v2 — Subscriptions + Attachments
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. SUBSCRIPTION HISTORY (payment records for plan upgrades)
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,          -- 'pro_monthly', 'pro_annual', etc.
  plan TEXT NOT NULL,             -- 'pro', 'business'
  period TEXT NOT NULL,           -- 'monthly', 'annual'
  amount NUMERIC(12,2) NOT NULL,  -- amount in rupees
  currency TEXT DEFAULT 'INR',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT DEFAULT 'created',  -- created, paid, failed, refunded
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_user ON public.subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_status ON public.subscription_history(status);

-- RLS for subscription_history
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscription_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert subscriptions"
  ON public.subscription_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update subscriptions"
  ON public.subscription_history FOR UPDATE
  USING (true);

-- ============================================
-- 2. ATTACHMENTS TABLE (generic file attachments)
-- ============================================
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,      -- 'tenant', 'payment', 'maintenance'
  entity_id UUID NOT NULL,        -- ID of the tenant/payment/maintenance record
  file_name TEXT NOT NULL,
  file_type TEXT DEFAULT '',      -- 'aadhaar', 'pan', 'screenshot', 'photo', 'other'
  file_url TEXT NOT NULL,         -- Supabase Storage public URL
  file_size INTEGER DEFAULT 0,   -- in bytes
  mime_type TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user ON public.attachments(user_id);

-- RLS for attachments
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments"
  ON public.attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments"
  ON public.attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments"
  ON public.attachments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. ADD ATTACHMENT URL COLUMNS to existing tables (for quick access)
-- ============================================

-- Tenant: direct links to PAN/Aadhaar images
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS aadhaar_url TEXT DEFAULT '';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS pan_url TEXT DEFAULT '';

-- Payments: screenshot of payment proof
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS screenshot_url TEXT DEFAULT '';

-- Maintenance: photo of the issue
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';

-- ============================================
-- 4. CREATE STORAGE BUCKET for attachments
-- ============================================
-- Note: Run these via Supabase Dashboard → Storage → New Bucket
-- or via SQL below:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'renteasy-attachments',
  'renteasy-attachments',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own folder
CREATE POLICY "Users can upload own attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'renteasy-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'renteasy-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'renteasy-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- 5. FUNCTION: Activate subscription after payment verification
-- ============================================
CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_user_id UUID,
  p_subscription_id UUID,
  p_plan TEXT,
  p_period TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT
)
RETURNS JSON AS $$
DECLARE
  sub_record RECORD;
  new_ends_at TIMESTAMPTZ;
BEGIN
  -- Get the subscription record
  SELECT * INTO sub_record FROM public.subscription_history
    WHERE id = p_subscription_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Subscription record not found');
  END IF;

  -- Calculate new end date
  IF p_period = 'annual' THEN
    new_ends_at := NOW() + INTERVAL '365 days';
  ELSE
    new_ends_at := NOW() + INTERVAL '30 days';
  END IF;

  -- Update subscription history
  UPDATE public.subscription_history
  SET status = 'paid',
      razorpay_payment_id = p_razorpay_payment_id,
      razorpay_signature = p_razorpay_signature,
      starts_at = NOW(),
      ends_at = new_ends_at
  WHERE id = p_subscription_id;

  -- Update user profile
  UPDATE public.profiles
  SET plan = p_plan,
      subscription_ends_at = new_ends_at,
      is_active = true
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'plan', p_plan,
    'ends_at', new_ends_at,
    'days_left', EXTRACT(DAY FROM new_ends_at - NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
