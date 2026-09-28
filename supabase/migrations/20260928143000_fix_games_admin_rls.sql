CREATE OR REPLACE FUNCTION public.can_manage_games()
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

REVOKE ALL ON FUNCTION public.can_manage_games() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_games() TO authenticated;

DROP POLICY IF EXISTS "admin_manage_games" ON public.games;
CREATE POLICY "admin_manage_games" ON public.games
  FOR ALL TO authenticated
  USING (public.can_manage_games())
  WITH CHECK (public.can_manage_games());