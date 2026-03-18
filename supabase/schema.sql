-- ============================================
-- RentEasy Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'trial', -- trial, free, pro, business
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PROPERTIES
-- ============================================
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  type TEXT DEFAULT '1BHK',
  rent NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit NUMERIC(12,2) DEFAULT 0,
  area NUMERIC(8,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. TENANTS
-- ============================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  aadhaar TEXT DEFAULT '',
  pan TEXT DEFAULT '',
  move_in_date DATE,
  lease_end DATE,
  emergency_name TEXT DEFAULT '',
  emergency_contact TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. PAYMENTS
-- ============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  month TEXT NOT NULL, -- '2026-03'
  status TEXT NOT NULL DEFAULT 'pending', -- paid, pending, overdue
  paid_date DATE,
  method TEXT DEFAULT '', -- UPI, Bank Transfer, Cash, Cheque
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. AGREEMENTS
-- ============================================
CREATE TABLE public.agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL,
  owner_address TEXT DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount NUMERIC(12,2) NOT NULL,
  deposit NUMERIC(12,2) DEFAULT 0,
  maintenance_charges NUMERIC(10,2) DEFAULT 0,
  notice_period INTEGER DEFAULT 1,
  escalation NUMERIC(4,1) DEFAULT 5.0,
  pdf_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. RECEIPTS
-- ============================================
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  receipt_no TEXT NOT NULL,
  month TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  pdf_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. MAINTENANCE REQUESTS
-- ============================================
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium', -- low, medium, high
  status TEXT DEFAULT 'open', -- open, in-progress, resolved
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. INDEXES for performance
-- ============================================
CREATE INDEX idx_properties_user ON public.properties(user_id);
CREATE INDEX idx_tenants_user ON public.tenants(user_id);
CREATE INDEX idx_tenants_property ON public.tenants(property_id);
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX idx_payments_month ON public.payments(month);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_agreements_user ON public.agreements(user_id);
CREATE INDEX idx_receipts_user ON public.receipts(user_id);
CREATE INDEX idx_maintenance_user ON public.maintenance_requests(user_id);
CREATE INDEX idx_maintenance_status ON public.maintenance_requests(status);

-- ============================================
-- 9. ROW LEVEL SECURITY (each user sees only their data)
-- ============================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own properties" ON public.properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (auth.uid() = user_id);

-- Tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenants" ON public.tenants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tenants" ON public.tenants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tenants" ON public.tenants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tenants" ON public.tenants FOR DELETE USING (auth.uid() = user_id);

-- Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE USING (auth.uid() = user_id);

-- Agreements
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own agreements" ON public.agreements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agreements" ON public.agreements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Receipts
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own receipts" ON public.receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own receipts" ON public.receipts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Maintenance
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own maintenance" ON public.maintenance_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenance" ON public.maintenance_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance" ON public.maintenance_requests FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 10. FUNCTION: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, plan, trial_started_at, subscription_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.phone, ''),
    'trial',
    NOW(),
    NOW() + INTERVAL '30 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 11. FUNCTION: Check license validity
-- ============================================
CREATE OR REPLACE FUNCTION public.check_license(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  profile_record RECORD;
  result JSON;
BEGIN
  SELECT * INTO profile_record FROM public.profiles WHERE id = user_uuid;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'reason', 'Profile not found');
  END IF;

  IF profile_record.plan = 'trial' AND profile_record.subscription_ends_at < NOW() THEN
    RETURN json_build_object(
      'valid', false,
      'reason', 'Trial expired',
      'plan', profile_record.plan,
      'expired_at', profile_record.subscription_ends_at
    );
  END IF;

  IF profile_record.plan IN ('pro', 'business') AND profile_record.subscription_ends_at < NOW() THEN
    -- Downgrade to free
    UPDATE public.profiles SET plan = 'free', is_active = true WHERE id = user_uuid;
    RETURN json_build_object(
      'valid', true,
      'reason', 'Subscription expired, downgraded to free',
      'plan', 'free'
    );
  END IF;

  RETURN json_build_object(
    'valid', true,
    'plan', profile_record.plan,
    'expires_at', profile_record.subscription_ends_at,
    'days_left', EXTRACT(DAY FROM profile_record.subscription_ends_at - NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. FUNCTION: Get dashboard stats
-- ============================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_properties', (SELECT COUNT(*) FROM properties WHERE user_id = user_uuid AND is_active = true),
    'total_tenants', (SELECT COUNT(*) FROM tenants WHERE user_id = user_uuid AND is_active = true),
    'total_collected', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE user_id = user_uuid AND status = 'paid'),
    'pending_payments', (SELECT COUNT(*) FROM payments WHERE user_id = user_uuid AND status IN ('pending', 'overdue')),
    'open_maintenance', (SELECT COUNT(*) FROM maintenance_requests WHERE user_id = user_uuid AND status != 'resolved'),
    'current_month_collected', (
      SELECT COALESCE(SUM(amount), 0) FROM payments
      WHERE user_id = user_uuid AND status = 'paid' AND month = TO_CHAR(NOW(), 'YYYY-MM')
    ),
    'current_month_pending', (
      SELECT COALESCE(SUM(amount), 0) FROM payments
      WHERE user_id = user_uuid AND status = 'pending' AND month = TO_CHAR(NOW(), 'YYYY-MM')
    ),
    'current_month_overdue', (
      SELECT COALESCE(SUM(amount), 0) FROM payments
      WHERE user_id = user_uuid AND status = 'overdue' AND month = TO_CHAR(NOW(), 'YYYY-MM')
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
