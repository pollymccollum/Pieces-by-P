-- ============================================================
-- PIECES BY P  |  Let the owner delete an order
-- Run once, on every project. Safe to re-run.
--
-- rls.sql gives the owner SELECT and UPDATE on orders, but never DELETE.
-- Without a policy, RLS doesn't raise an error — it just matches no rows,
-- so the delete "succeeds" and the order is still there. The admin now
-- checks the returned row count and says so, but the real fix is here.
--
-- order_items has ON DELETE CASCADE, and referential actions run as the
-- table owner rather than the caller, so the lines go with the order
-- without needing a policy of their own.
--
-- Deliberately owner-only. 'anon' can still INSERT an order (that's
-- checkout) and can never read, change, or rYEemove one.
-- ============================================================

drop policy if exists "owner delete orders" on orders;

create policy "owner delete orders" on orders
  for delete using (auth.role() = 'authenticated');

-- Verify: expect exactly one row, cmd = DELETE, roles = {public},
-- qual = (auth.role() = 'authenticated'::text)
select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'orders'
  and cmd = 'DELETE';
