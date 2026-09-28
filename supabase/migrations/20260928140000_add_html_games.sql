CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '🎮',
  html_content text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE games ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE games ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '🎮';
ALTER TABLE games ADD COLUMN IF NOT EXISTS html_content text NOT NULL DEFAULT '';
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE games ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_games" ON games;
CREATE POLICY "anon_read_games" ON games
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_manage_games" ON games;
CREATE POLICY "admin_manage_games" ON games
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

GRANT SELECT ON games TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON games TO authenticated;