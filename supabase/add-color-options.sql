-- ============================================================
-- PIECES BY P  |  Per-piece colour combinations
-- Run once, on every project. Safe to re-run.
--
-- Polly makes the same design in several colourways, and until now the only
-- way for a customer to ask for one was to type it into the "make it yours"
-- box and hope it was read correctly. This gives each piece its own list of
-- combinations, shown as buttons, so the choice is made rather than described.
--
-- products.color_options — the list she offers, in the order she wants them
--   shown. Empty (the default) means this piece has no colourways and the
--   picker doesn't appear at all, which is how every existing piece behaves.
--
--   NOT the same as products.colors, which is a list of hex values used to
--   draw the beaded-strand illustration for pieces with no photo yet. Two
--   different jobs, deliberately two different columns.
--
-- order_items.color — what the customer actually chose, copied onto the order
--   the way product_name and unit_price_cents already are. Stored as text, not
--   as a reference: if Polly renames or removes a colourway next month, an
--   order placed today must still say what was ordered.
-- ============================================================

alter table products
  add column if not exists color_options text[] not null default '{}';

alter table order_items
  add column if not exists color text;

-- A colourway is a short label like 'Red/Blue/White'. The admin caps each at
-- 60 characters and the list at 40; the database backs both up.
--
-- The per-element test lives in a function because a CHECK constraint may not
-- contain a subquery, and there is no way to test every element of an array
-- inline without one. A CHECK may call a function, and the function may
-- contain the query — which is the standard way around this.
--
-- IMMUTABLE because it reads nothing but its own argument, which is what
-- makes it legal in a constraint at all.
create or replace function color_options_valid(opts text[])
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(bool_and(length(o) between 1 and 60), true)
  from unnest(opts) as o;
$$;

alter table products drop constraint if exists products_color_options_sane;
alter table products
  add constraint products_color_options_sane
  check (
    coalesce(array_length(color_options, 1), 0) <= 40
    and color_options_valid(color_options)
  );

-- Verify: expect two rows
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'products' and column_name = 'color_options')
    or (table_name = 'order_items' and column_name = 'color')
  )
order by table_name;
