-- ============================================
-- RentEasy Schema v6 — Move Rent to Tenant
-- Run this in Supabase SQL Editor AFTER all previous schema files
-- ============================================

-- ============================================
-- FIX #1: ADD rent COLUMN TO TENANTS
-- Each tenant has their own rent amount (supports multi-tenant properties)
-- Previously rent was on properties, but 2 tenants in the same property
-- may pay different rents. Tenant-level rent is the source of truth.
-- ============================================
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS rent NUMERIC(12,2) NOT NULL DEFAULT 0;

-- ============================================
-- FIX #2: MIGRATE existing rent data from properties to tenants
-- Copy property rent to all active tenants that don't have rent set yet
-- ============================================
UPDATE public.tenants t
SET rent = p.rent
FROM public.properties p
WHERE t.property_id = p.id
  AND (t.rent = 0 OR t.rent IS NULL);
