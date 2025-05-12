-- Migration to set up storage permissions for the listings bucket
-- This ensures authenticated users can upload and view images

-- Create the listings bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

-- Set up policies for the listings bucket

-- Allow authenticated users to upload files to the listings bucket
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listings');

-- Allow all users to view files in the listings bucket
CREATE POLICY "Allow all users to view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

-- Allow users to update their own files
CREATE POLICY "Allow users to update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'listings' AND auth.uid() = owner::uuid)
WITH CHECK (bucket_id = 'listings' AND auth.uid() = owner::uuid);

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listings' AND auth.uid() = owner::uuid);

