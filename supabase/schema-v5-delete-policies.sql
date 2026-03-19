-- ============================================
-- RentEasy Schema v5 — Delete Policies + Unit/Floor Column
-- Run this in Supabase SQL Editor AFTER all previous schema files
-- ============================================

-- ============================================
-- FIX #1: ADD DELETE POLICY FOR PAYMENTS
-- Without this, users cannot delete their own payments via the client
-- ============================================
CREATE POLICY "Users can delete own payments"
  ON public.payments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FIX #2: ADD DELETE POLICY FOR MAINTENANCE REQUESTS
-- Without this, users cannot delete their own maintenance requests via the client
-- ============================================
CREATE POLICY "Users can delete own maintenance"
  ON public.maintenance_requests FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FIX #3: ADD DELETE POLICY FOR AGREEMENTS (for future use)
-- ============================================
CREATE POLICY "Users can delete own agreements"
  ON public.agreements FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FIX #4: ADD DELETE POLICY FOR RECEIPTS (for future use)
-- ============================================
CREATE POLICY "Users can delete own receipts"
  ON public.receipts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FIX #5: ADD unit_number COLUMN TO TENANTS
-- Allows identifying which floor/room/unit a tenant occupies
-- when multiple tenants share the same property address
-- ============================================
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS unit_number TEXT DEFAULT '';

-- ============================================
-- FIX #6: CHANGE property_id FKs TO SET NULL FOR HARD DELETE SUPPORT
-- When a property is hard-deleted, we want to keep payments/agreements/receipts/maintenance
-- with property_id set to NULL (data preservation) rather than cascade-deleting everything.
-- Tenants already have ON DELETE SET NULL — this makes the rest consistent.
-- ============================================

-- payments: change property_id from NOT NULL CASCADE to nullable SET NULL
ALTER TABLE public.payments ALTER COLUMN property_id DROP NOT NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_property_id_fkey;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- agreements: change property_id from NOT NULL CASCADE to nullable SET NULL
ALTER TABLE public.agreements ALTER COLUMN property_id DROP NOT NULL;
ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_property_id_fkey;
ALTER TABLE public.agreements
  ADD CONSTRAINT agreements_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- receipts: change property_id from NOT NULL CASCADE to nullable SET NULL
ALTER TABLE public.receipts ALTER COLUMN property_id DROP NOT NULL;
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_property_id_fkey;
ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- maintenance_requests: change property_id from NOT NULL CASCADE to nullable SET NULL
ALTER TABLE public.maintenance_requests ALTER COLUMN property_id DROP NOT NULL;
ALTER TABLE public.maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_property_id_fkey;
ALTER TABLE public.maintenance_requests
  ADD CONSTRAINT maintenance_requests_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- ============================================
-- FIX #7: ADD DELETE POLICY FOR PROPERTIES
-- Without this, users cannot hard-delete their own properties via the client
-- ============================================
CREATE POLICY "Users can delete own properties"
  ON public.properties FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FIX #8: ADD name COLUMN TO PROPERTIES
-- Short friendly name for quick identification (e.g. "Sunrise Apartments")
-- ============================================
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
