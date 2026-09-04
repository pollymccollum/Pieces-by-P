-- ============================================================
-- PIECES BY P  |  Record whether the confirmation email got out
-- Run once, on every project. Safe to re-run.
--
-- Sending is best-effort by design: a mail failure must never fail an order,
-- because a customer whose confirmation bounced still has a real order and
-- Polly can still see it. But until now the only trace of a failure was a
-- console.error in Netlify's function logs, which nobody is watching.
--
-- A Brevo outage, an expired key, or an exhausted daily quota would mean
-- customers quietly stop receiving confirmations, and the first anyone hears
-- of it is somebody asking whether their order went through.
--
-- Writing the outcome onto the order puts it where Polly is already looking.
--
--   null      — not attempted (email not configured, or an older order)
--   'sent'    — Brevo accepted it
--   'failed'  — it did not go; the reason is in the logs
--   'skipped' — held back deliberately, because the hour looked like abuse
--               rather than trade. See orderEmailBudgetSpent() in
--               lib/rate-limit.ts: the order is always saved, only the
--               automatic receipt pauses.
-- ============================================================

alter table orders
  add column if not exists confirmation_email text;

alter table orders drop constraint if exists orders_confirmation_email_valid;
alter table orders
  add constraint orders_confirmation_email_valid
  check (confirmation_email is null or confirmation_email in ('sent', 'failed', 'skipped'));

-- Verify: expect one row
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'orders'
  and column_name = 'confirmation_email';
