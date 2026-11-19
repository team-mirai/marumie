-- public スキーマのテーブルは Supabase の Data API（PostgREST）経由で anon / authenticated に公開されている。
-- ポリシーなしで RLS を有効にし、anon key 経由のアクセスを既定で拒否する。
-- Prisma が接続する postgres ロールはテーブル所有者で、FORCE を付けないので RLS の対象外のまま。

-- 既存テーブル（_prisma_migrations を含む）
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.schemaname, t.tablename);
  END LOOP;
END;
$$;

-- 以降のマイグレーションで public に作られるテーブルも自動で RLS を有効にする
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name = 'public' THEN
      EXECUTE format('ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY', cmd.object_identity);
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

DROP EVENT TRIGGER IF EXISTS ensure_rls_on_public_tables;
CREATE EVENT TRIGGER ensure_rls_on_public_tables
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
