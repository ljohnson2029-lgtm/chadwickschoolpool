
-- Move only extensions that support SET SCHEMA
-- Skip pg_net (Supabase system extension) and plpgsql
DO $$
DECLARE
  ext record;
BEGIN
  FOR ext IN 
    SELECT extname FROM pg_extension WHERE extnamespace = 'public'::regnamespace
    AND extname NOT IN ('plpgsql', 'pg_net', 'pg_graphql', 'pg_stat_statements', 'pgcrypto', 'pgjwt', 'supabase_vault')
  LOOP
    BEGIN
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext.extname);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not move extension %: %', ext.extname, SQLERRM;
    END;
  END LOOP;
END $$;
