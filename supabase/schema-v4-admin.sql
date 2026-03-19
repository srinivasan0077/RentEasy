-- ============================================
-- RentEasy Schema v4 — Admin Portal Support
-- Run this in Supabase SQL Editor AFTER schema-v3-security.sql
-- ============================================

-- Add storage bonus column to profiles (admin can grant extra storage)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storage_bonus_mb INTEGER DEFAULT 0;

-- Protect storage_bonus_mb from client-side changes (add it to the plan protection trigger)
CREATE OR REPLACE FUNCTION public.protect_plan_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.plan IS DISTINCT FROM NEW.plan) OR 
     (OLD.subscription_ends_at IS DISTINCT FROM NEW.subscription_ends_at) OR
     (OLD.trial_started_at IS DISTINCT FROM NEW.trial_started_at) OR
     (OLD.storage_bonus_mb IS DISTINCT FROM NEW.storage_bonus_mb) THEN
    
    IF current_setting('role') != 'service_role' AND 
       current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
      NEW.plan := OLD.plan;
      NEW.subscription_ends_at := OLD.subscription_ends_at;
      NEW.trial_started_at := OLD.trial_started_at;
      NEW.storage_bonus_mb := OLD.storage_bonus_mb;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update storage limit check to include bonus storage
CREATE OR REPLACE FUNCTION public.check_storage_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_usage BIGINT;
  plan_limit_bytes BIGINT;
  bonus_bytes BIGINT;
  user_plan TEXT;
  user_bonus INTEGER;
BEGIN
  SELECT plan, COALESCE(storage_bonus_mb, 0) INTO user_plan, user_bonus
  FROM public.profiles WHERE id = NEW.user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  plan_limit_bytes := CASE user_plan
    WHEN 'free' THEN 0
    WHEN 'trial' THEN 50 * 1024 * 1024
    WHEN 'pro' THEN 100 * 1024 * 1024
    WHEN 'business' THEN 500 * 1024 * 1024
    ELSE 0
  END;

  -- Add bonus storage
  bonus_bytes := user_bonus * 1024 * 1024;
  plan_limit_bytes := plan_limit_bytes + bonus_bytes;

  -- Block if no storage at all (free plan with no bonus)
  IF plan_limit_bytes = 0 THEN
    RAISE EXCEPTION 'STORAGE_LIMIT: Your % plan does not include file storage. Upgrade to Pro or Business.', user_plan;
  END IF;

  SELECT COALESCE(SUM(file_size), 0) INTO current_usage
  FROM public.attachments WHERE user_id = NEW.user_id;

  IF (current_usage + COALESCE(NEW.file_size, 0)) > plan_limit_bytes THEN
    RAISE EXCEPTION 'STORAGE_LIMIT: Storage limit exceeded. You have used % MB of % MB on your % plan.', 
      ROUND(current_usage / (1024.0 * 1024.0), 1),
      ROUND(plan_limit_bytes / (1024.0 * 1024.0)),
      user_plan;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_storage_usage to include bonus
CREATE OR REPLACE FUNCTION public.get_storage_usage(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  total_bytes BIGINT;
  file_count INTEGER;
  user_plan TEXT;
  user_bonus INTEGER;
  plan_limit_bytes BIGINT;
BEGIN
  SELECT plan, COALESCE(storage_bonus_mb, 0) INTO user_plan, user_bonus
  FROM public.profiles WHERE id = user_uuid;
  
  SELECT COALESCE(SUM(file_size), 0), COUNT(*)
  INTO total_bytes, file_count
  FROM public.attachments WHERE user_id = user_uuid;

  plan_limit_bytes := CASE user_plan
    WHEN 'free' THEN 0
    WHEN 'trial' THEN 50 * 1024 * 1024
    WHEN 'pro' THEN 100 * 1024 * 1024
    WHEN 'business' THEN 500 * 1024 * 1024
    ELSE 0
  END;

  -- Add bonus
  plan_limit_bytes := plan_limit_bytes + (user_bonus * 1024 * 1024);

  RETURN json_build_object(
    'used_bytes', total_bytes,
    'used_mb', ROUND(total_bytes / (1024.0 * 1024.0), 2),
    'limit_mb', ROUND(plan_limit_bytes / (1024.0 * 1024.0)),
    'bonus_mb', user_bonus,
    'file_count', file_count,
    'plan', user_plan,
    'allowed', total_bytes < plan_limit_bytes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
