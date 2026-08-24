-- ============================================================
-- PIECES BY P  |  Verify Row Level Security
-- Paste into the Supabase SQL Editor and run. Read-only — it
-- changes nothing, it just reports the current state.
--
-- WHAT YOU WANT TO SEE: rls_enabled = true on all five tables,
-- and a non-zero policy count on each.
--
-- Why this exists: from outside the database, "no rows returned"
-- looks identical whether RLS is filtering everything out or the
-- table is simply empty. Only Postgres can tell you which it is.
-- Run this again on Polly's real project at launch.
-- ============================================================

select
  t.tablename                                as table_name,
  t.rowsecurity                              as rls_enabled,
  count(p.policyname)                        as policy_count,
  coalesce(string_agg(p.policyname, ', ' order by p.policyname), '(none)') as policies
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname
 and p.tablename  = t.tablename
where t.schemaname = 'public'
  and t.tablename in ('site_settings', 'products', 'product_images', 'orders', 'order_items')
group by t.tablename, t.rowsecurity
order by t.tablename;
