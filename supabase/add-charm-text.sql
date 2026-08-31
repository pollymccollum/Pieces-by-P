-- ============================================================
-- PIECES BY P  |  Lettered illustration charm
-- Run once, on every project. Safe to re-run.
--
-- products.charm picks the shape drawn on the beaded-strand illustration
-- (the placeholder shown before a piece has photos). It was heart / star /
-- coin only. Setting charm = 'text' draws a small gold charm carrying this
-- wording instead, so an initial or a short word can appear the way it
-- would on the real piece.
--
-- Only read when charm = 'text'. Left over from a change of mind, it does
-- nothing.
--
-- No new RLS policy needed: rls.sql already grants the owner ALL on products.
-- ============================================================

alter table products
  add column if not exists charm_text text;

-- The charm is a few millimetres wide in the drawing; more than a dozen
-- characters cannot be rendered legibly, so the database says so too.
alter table products
  drop constraint if exists products_charm_text_len;

alter table products
  add constraint products_charm_text_len
  check (charm_text is null or char_length(charm_text) <= 12);

-- Verify: expect one row
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'products'
  and column_name = 'charm_text';
