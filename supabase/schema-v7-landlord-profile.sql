-- ============================================
-- V7: Persist Landlord Profile & Settings in Supabase
-- Run this in Supabase SQL Editor
-- ============================================

-- Add landlord detail columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS landlord_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS landlord_phone TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS landlord_pan TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS landlord_aadhaar TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS landlord_address TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rent_due_day INTEGER DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS landlord_signature TEXT DEFAULT '';

-- DB-level guard: reject signatures larger than 300KB (base64 of ~200KB image)
ALTER TABLE public.profiles ADD CONSTRAINT check_signature_size
  CHECK (octet_length(landlord_signature) <= 307200); -- 300 * 1024

-- The landlord_signature column stores a base64 data URL of the signature image.
-- Client limits file to 200KB, base64 adds ~33% overhead → max ~270KB, capped at 300KB.

-- Migrate existing localStorage data:
-- After deploying the app code, the first time a user loads the Landlord Profile
-- or Receipts page, the app will automatically migrate their localStorage data
-- to Supabase and clean up the local copy. No manual migration needed.
