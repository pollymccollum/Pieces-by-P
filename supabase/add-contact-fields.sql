-- ============================================================
-- PIECES BY P  |  Migration: customer contact fields
-- Run once on any project created BEFORE this change.
-- Not needed on a fresh project — schema.sql already includes both.
-- Safe to re-run: both statements are idempotent.
--
-- 1. Adds customer_instagram (bare handle; the app adds the @ for
--    display and builds the instagram.com link from it).
-- 2. Makes customer_email optional. Checkout now requires at least ONE
--    of email / phone / Instagram rather than email specifically, so a
--    customer who only wants to give a phone number can still order.
--    The "at least one" rule is enforced in lib/order-utils.ts.
-- ============================================================

alter table orders
  add column if not exists customer_instagram text;

alter table orders
  alter column customer_email drop not null;
