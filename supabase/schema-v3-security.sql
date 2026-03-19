-- ============================================
-- RentEasy Schema v3 — Security Hardening
-- Run this in Supabase SQL Editor AFTER schema.sql and schema-v2.sql
-- ============================================

-- ============================================
-- FIX #1: PREVENT USERS FROM CHANGING THEIR OWN PLAN
-- Current RLS: "Users can update own profile" allows updating ANY column
-- A user could run: UPDATE profiles SET plan = 'business' WHERE id = auth.uid()
-- 
-- Solution: DB trigger that blocks plan/subscription changes from non-service-role
-- ============================================

CREATE OR REPLACE FUNCTION public.protect_plan_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- If plan or subscription fields are being changed
  IF (OLD.plan IS DISTINCT FROM NEW.plan) OR 
     (OLD.subscription_ends_at IS DISTINCT FROM NEW.subscription_ends_at) OR
     (OLD.trial_started_at IS DISTINCT FROM NEW.trial_started_at) THEN
    
    -- Only allow if called by service_role (edge functions) or SECURITY DEFINER functions
    -- Regular users via anon/authenticated key will be blocked
    IF current_setting('role') != 'service_role' AND 
       current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
      -- Revert the protected columns to their old values
      NEW.plan := OLD.plan;
      NEW.subscription_ends_at := OLD.subscription_ends_at;
      NEW.trial_started_at := OLD.trial_started_at;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS protect_profile_plan ON public.profiles;
CREATE TRIGGER protect_profile_plan
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_plan_columns();


-- ============================================
-- FIX #2: SERVER-SIDE STORAGE LIMIT CHECK
-- DB trigger on attachments table that blocks inserts when storage limit exceeded
-- ============================================

CREATE OR REPLACE FUNCTION public.check_storage_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_usage BIGINT;
  plan_limit_bytes BIGINT;
  user_plan TEXT;
BEGIN
  -- Get user's current plan
  SELECT plan INTO user_plan FROM public.profiles WHERE id = NEW.user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Calculate plan storage limit in bytes
  plan_limit_bytes := CASE user_plan
    WHEN 'free' THEN 0
    WHEN 'trial' THEN 50 * 1024 * 1024      -- 50 MB
    WHEN 'pro' THEN 100 * 1024 * 1024        -- 100 MB
    WHEN 'business' THEN 500 * 1024 * 1024   -- 500 MB
    ELSE 0  -- Unknown plan = no storage
  END;

  -- Block all uploads for free plan
  IF plan_limit_bytes = 0 THEN
    RAISE EXCEPTION 'STORAGE_LIMIT: Your % plan does not include file storage. Upgrade to Pro or Business.', user_plan;
  END IF;

  -- Get current total usage
  SELECT COALESCE(SUM(file_size), 0) INTO current_usage
  FROM public.attachments
  WHERE user_id = NEW.user_id;

  -- Check if adding this file would exceed the limit
  IF (current_usage + COALESCE(NEW.file_size, 0)) > plan_limit_bytes THEN
    RAISE EXCEPTION 'STORAGE_LIMIT: Storage limit exceeded. You have used % MB of % MB on your % plan.', 
      ROUND(current_usage / (1024.0 * 1024.0), 1),
      ROUND(plan_limit_bytes / (1024.0 * 1024.0)),
      user_plan;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_storage_limit ON public.attachments;
CREATE TRIGGER enforce_storage_limit
  BEFORE INSERT ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.check_storage_limit();


-- ============================================
-- FIX #3: TIGHTEN subscription_history RLS
-- Currently INSERT/UPDATE is WITH CHECK (true) — any user can insert fake records
-- Only service_role (Edge Functions) should insert/update
-- ============================================

-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "Service role can insert subscriptions" ON public.subscription_history;
DROP POLICY IF EXISTS "Service role can update subscriptions" ON public.subscription_history;

-- Recreate: block client-side inserts/updates entirely
-- Edge Functions use service_role key which bypasses RLS
-- So no INSERT/UPDATE policy needed for regular users
-- (Users can only SELECT their own records)


-- ============================================
-- FIX #4: FUNCTION to get storage usage (server-side, tamper-proof)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_storage_usage(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  total_bytes BIGINT;
  file_count INTEGER;
  user_plan TEXT;
  plan_limit_bytes BIGINT;
BEGIN
  SELECT plan INTO user_plan FROM public.profiles WHERE id = user_uuid;
  
  SELECT COALESCE(SUM(file_size), 0), COUNT(*)
  INTO total_bytes, file_count
  FROM public.attachments
  WHERE user_id = user_uuid;

  plan_limit_bytes := CASE user_plan
    WHEN 'free' THEN 0
    WHEN 'trial' THEN 50 * 1024 * 1024
    WHEN 'pro' THEN 100 * 1024 * 1024
    WHEN 'business' THEN 500 * 1024 * 1024
    ELSE 0
  END;

  RETURN json_build_object(
    'used_bytes', total_bytes,
    'used_mb', ROUND(total_bytes / (1024.0 * 1024.0), 2),
    'limit_mb', ROUND(plan_limit_bytes / (1024.0 * 1024.0)),
    'file_count', file_count,
    'plan', user_plan,
    'allowed', total_bytes < plan_limit_bytes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
