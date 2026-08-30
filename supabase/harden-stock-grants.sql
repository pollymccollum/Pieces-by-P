-- ============================================================
-- PIECES BY P  |  SECURITY FIX — run on any existing project
--
-- reserve_stock() and release_stock() were granted to 'anon'. They are
-- SECURITY DEFINER, so anyone able to execute them can change stock on any
-- product. Product ids appear in the page source and the publishable key is
-- public by design, so any visitor could have called:
--
--   POST /rest/v1/rpc/reserve_stock
--   {"items": [{"product_id": "<id from the page>", "qty": 999}]}
--
-- and marked the entire shop sold out. No data was exposed and no money was
-- at risk, but the shop would have stopped selling until someone noticed.
--
-- Checkout is unaffected: it runs server-side with the service-role key.
-- The admin calls these as 'authenticated'.
-- ============================================================

revoke all on function reserve_stock(jsonb) from public, anon;
revoke all on function release_stock(jsonb) from public, anon;

grant execute on function reserve_stock(jsonb) to authenticated, service_role;
grant execute on function release_stock(jsonb) to authenticated, service_role;

-- Verify: 'anon' should NOT appear in the results below.
select p.proname as function_name, r.rolname as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(p.proacl) a
join pg_roles r on r.oid = a.grantee
where n.nspname = 'public'
  and p.proname in ('reserve_stock', 'release_stock')
  and a.privilege_type = 'EXECUTE'
order by p.proname, r.rolname;
