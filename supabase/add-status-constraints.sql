-- ============================================================
-- PIECES BY P  |  Teach the database the values it will accept
-- Run once, on every project. Safe to re-run.
--
-- The status columns were plain `text` with their valid values written in a
-- comment beside them. The app has always validated all four correctly, so
-- nothing has ever written a bad one — but a comment is not a constraint.
-- One hand-run UPDATE in the SQL editor, or one future code path that skips
-- the server action, could store a status nothing renders, and it would stay
-- invisible until an order looked wrong on the board.
--
-- The same reasoning for stock: reserve_stock() cannot take it below zero,
-- and the admin refuses a negative number, but the column itself would
-- happily hold -4.
--
-- If any of these fail on an existing project, that IS the finding: something
-- already wrote a value the app can't render. Fix the row, then re-run.
-- ============================================================

alter table orders drop constraint if exists orders_payment_method_valid;
alter table orders
  add constraint orders_payment_method_valid
  check (payment_method in ('venmo', 'card'));

alter table orders drop constraint if exists orders_payment_status_valid;
alter table orders
  add constraint orders_payment_status_valid
  check (payment_status in ('pending', 'paid', 'refunded'));

alter table orders drop constraint if exists orders_fulfillment_status_valid;
alter table orders
  add constraint orders_fulfillment_status_valid
  check (fulfillment_status in ('new', 'making', 'shipped'));

-- Money is stored in integer cents and can never be negative.
alter table orders drop constraint if exists orders_totals_not_negative;
alter table orders
  add constraint orders_totals_not_negative
  check (subtotal_cents >= 0 and shipping_cents >= 0 and total_cents >= 0);

-- null = made to order, unlimited. A number is a real count.
alter table products drop constraint if exists products_stock_not_negative;
alter table products
  add constraint products_stock_not_negative
  check (stock is null or stock >= 0);

alter table products drop constraint if exists products_price_not_negative;
alter table products
  add constraint products_price_not_negative
  check (price_cents >= 0);

-- Verify: expect six rows
select conname as constraint_name
from pg_constraint
where conrelid in ('orders'::regclass, 'products'::regclass)
  and contype = 'c'
  and conname in (
    'orders_payment_method_valid',
    'orders_payment_status_valid',
    'orders_fulfillment_status_valid',
    'orders_totals_not_negative',
    'products_stock_not_negative',
    'products_price_not_negative'
  )
order by conname;
