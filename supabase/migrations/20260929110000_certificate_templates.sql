CREATE OR REPLACE FUNCTION public.can_manage_certificate_templates()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_certificate_templates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_certificate_templates() TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificate-templates',
  'certificate-templates',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public_read_certificate_templates" ON storage.objects;
CREATE POLICY "public_read_certificate_templates" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'certificate-templates');

DROP POLICY IF EXISTS "admin_upload_certificate_templates" ON storage.objects;
CREATE POLICY "admin_upload_certificate_templates" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificate-templates' AND public.can_manage_certificate_templates());

DROP POLICY IF EXISTS "admin_update_certificate_templates" ON storage.objects;
CREATE POLICY "admin_update_certificate_templates" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificate-templates' AND public.can_manage_certificate_templates())
  WITH CHECK (bucket_id = 'certificate-templates' AND public.can_manage_certificate_templates());

DROP POLICY IF EXISTS "admin_delete_certificate_templates" ON storage.objects;
CREATE POLICY "admin_delete_certificate_templates" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificate-templates' AND public.can_manage_certificate_templates());