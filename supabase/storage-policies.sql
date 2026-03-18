-- ============================================
-- Storage Policies for renteasy-attachments bucket
-- Run this in Supabase SQL Editor AFTER creating the bucket from Dashboard
-- ============================================

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload own attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'renteasy-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to view their own files
CREATE POLICY "Users can view own attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'renteasy-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update (overwrite) their own files
CREATE POLICY "Users can update own attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'renteasy-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'renteasy-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- If bucket is PUBLIC, allow anyone to read (for viewing uploaded images)
-- This is safe because file paths are UUID-based and not guessable
CREATE POLICY "Public read access for attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'renteasy-attachments');
