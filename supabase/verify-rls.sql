-- ============================================================
-- PIECES BY P  |  Verify Row Level Security
-- Paste into the Supabase SQL Editor and run. Read-only — it
-- changes nothing, it just reports the current state.
--
-- WHAT YOU WANT TO SEE: every row says PASS.
--
-- Why this exists: from outside the database, "no rows returned"
-- looks identical whether RLS is filtering everything out or the
-- table is simply empty. Only Postgres can tell you which it is.
-- Run this again on Polly's real project at launch.
--
-- 'messages' was missing from this list until Oct 2026, which is
-- exactly the kind of gap this file is supposed to close: it holds
-- contact-form submissions — names, email addresses, whatever the
-- customer typed — so it needs the same protection as orders, and
-- was the one table nobody was checking.
-- ============================================================

select
  t.tablename as table_name,
  t.rowsecurity as rls_enabled,
  count(p.policyname) as policy_count,
  case
    when not t.rowsecurity then 'PROBLEM — RLS is OFF, anyone with the public key can read this table'
    when count(p.policyname) = 0 then 'PROBLEM — RLS on but no policies, so nothing is reachable at all'
    else 'PASS'
  end as verdict,
  coalesce(string_agg(p.policyname, ', ' order by p.policyname), '(none)') as policies
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname
 and p.tablename  = t.tablename
where t.schemaname = 'public'
  and t.tablename in (
    'site_settings',
    'products',
    'product_images',
    'orders',
    'order_items',
    'messages'
  )
group by t.tablename, t.rowsecurity
order by
  -- Problems first, so a bad row can't scroll past unnoticed.
  (t.rowsecurity and count(p.policyname) > 0),
  t.tablename;

-- ------------------------------------------------------------
-- Second check: did every table in the schema get listed above?
-- A table created later and never added to the list would be
-- silently unprotected AND silently unchecked.
-- ------------------------------------------------------------
select
  tablename as unchecked_table,
  rowsecurity as rls_enabled,
  'Not in the list above — add it, and confirm it should be reachable' as note
from pg_tables
where schemaname = 'public'
  and tablename not in (
    'site_settings',
    'products',
    'product_images',
    'orders',
    'order_items',
    'messages'
  );
