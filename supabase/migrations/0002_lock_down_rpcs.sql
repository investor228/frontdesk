-- Restrict the SECURITY DEFINER functions to the service role.
--
-- Both functions run with the definer's rights, bypassing row-level security,
-- and Postgres grants EXECUTE on new functions to PUBLIC by default. Since the
-- anon key ships in the browser, anyone holding it could call them directly:
--
--   match_chunks(<another tenant's bot id>, <any vector>, 1000)
--     -> reads that tenant's entire knowledge base
--
--   try_consume_message(<another tenant's account id>, 99999)
--     -> burns that tenant's monthly message allowance
--
-- Both are now callable only by the service role. Every caller reaches them
-- through a server route that has already established which bot the request is
-- allowed to touch — the widget from a verified public key, the playground from
-- an RLS-scoped ownership check.

revoke all on function match_chunks(uuid, vector(1536), int) from public, anon, authenticated;
grant execute on function match_chunks(uuid, vector(1536), int) to service_role;

revoke all on function try_consume_message(uuid, integer) from public, anon, authenticated;
grant execute on function try_consume_message(uuid, integer) to service_role;

-- Same reasoning for the signup trigger helper: it is invoked by the trigger,
-- never by a client.
revoke all on function handle_new_user() from public, anon, authenticated;
