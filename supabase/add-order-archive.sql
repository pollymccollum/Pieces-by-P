-- ============================================================
-- PIECES BY P  |  Archive an order instead of deleting it
-- Run once, on every project. Safe to re-run.
--
-- Archiving is the answer to a cluttered board; deleting is for genuine
-- rubbish. An archived order keeps every detail — what was bought, what it
-- cost, where it went — it just stops competing for attention.
--
-- A timestamp rather than a boolean, so "when did she consider this done?"
-- is answerable later. NULL = still on the board.
--
-- No new RLS policy needed: rls.sql already grants the owner UPDATE on
-- orders, and this is an UPDATE. Contrast add-order-delete.sql, which had
-- to add a policy because DELETE was never granted.
-- ============================================================

alter table orders
  add column if not exists archived_at timestamptz;

-- The board's default view is "not archived", and that runs on every load
-- of the orders page.
create index if not exists orders_archived_idx
  on orders (archived_at)
  where archived_at is null;

-- Verify: expect one row, archived_at / timestamp with time zone / YES
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'orders'
  and column_name = 'archived_at';
