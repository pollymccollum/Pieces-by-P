-- ============================================================
-- PIECES BY P  |  Stock tracking
--
-- REQUIRED ON EVERY PROJECT, INCLUDING BRAND NEW ONES.
-- The name reads like a patch, but it isn't optional: schema.sql creates the
-- stock COLUMN, while the reserve_stock()/release_stock() FUNCTIONS below
-- exist only here — and checkout calls them. Skip this file and placing an
-- order fails.
--
-- Run once. Safe to re-run (idempotent).
--
-- products.stock:
--   null = made to order, unlimited. This is the DEFAULT, because most
--          handmade pieces aren't limited runs.
--   0    = sold out
--   N    = N left
--
-- Stock is reserved the moment an order is placed (before a Venmo payment
-- arrives), so a piece already spoken for can't be sold twice. If a customer
-- never pays, Polly puts the number back in the admin.
--
-- WHY THESE ARE DATABASE FUNCTIONS:
--   1. Anonymous shoppers have no UPDATE permission on products (correct —
--      otherwise they could edit prices). SECURITY DEFINER lets this one
--      controlled operation through without opening the table up.
--   2. "check then update" from the app has a race: two shoppers can both
--      read "1 left" and both buy it. The UPDATE ... WHERE stock >= qty here
--      is a single atomic statement, so exactly one of them wins.
-- ============================================================

alter table products
  add column if not exists stock integer;

alter table products
  drop constraint if exists products_stock_nonnegative;
alter table products
  add constraint products_stock_nonnegative check (stock is null or stock >= 0);

-- ------------------------------------------------------------
-- reserve_stock(items)
-- items: [{"product_id": "<uuid>", "qty": 2}, ...]
-- Raises OUT_OF_STOCK:<product_id> if any line can't be filled, which rolls
-- back every decrement in this call — no partial reservations.
-- ------------------------------------------------------------
create or replace function reserve_stock(items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item      jsonb;
  pid       uuid;
  want      integer;
  changed   integer;
  untracked boolean;
begin
  for item in select * from jsonb_array_elements(items) loop
    pid  := (item->>'product_id')::uuid;
    want := (item->>'qty')::integer;

    if want is null or want < 1 then
      raise exception 'BAD_QUANTITY:%', pid;
    end if;

    -- Atomic: only succeeds if there is still enough left.
    update products
       set stock = stock - want
     where id = pid
       and stock is not null
       and stock >= want;

    get diagnostics changed = row_count;

    if changed = 0 then
      -- No row updated. Either the piece is untracked (fine, nothing to
      -- reserve) or there genuinely isn't enough left (fail the order).
      select (stock is null) into untracked from products where id = pid;

      if untracked is null then
        raise exception 'NO_SUCH_PRODUCT:%', pid;
      elsif not untracked then
        raise exception 'OUT_OF_STOCK:%', pid;
      end if;
    end if;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- release_stock(items)
-- Compensating action: puts stock back if the order fails to save after
-- it was reserved. Untracked pieces (stock is null) are left alone.
-- ------------------------------------------------------------
create or replace function release_stock(items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(items) loop
    update products
       set stock = stock + (item->>'qty')::integer
     where id = (item->>'product_id')::uuid
       and stock is not null;
  end loop;
end;
$$;

-- Deliberately NOT granted to anon.
--
-- These are SECURITY DEFINER, so whoever may execute them can change stock
-- on any product. Product ids appear in the page source and the publishable
-- key is public by design, so granting anon would let any visitor call
--   POST /rest/v1/rpc/reserve_stock  {"items":[{"product_id":"...","qty":999}]}
-- and mark the whole shop sold out.
--
-- Checkout still works: it runs server-side and calls these with the
-- service-role key, which never reaches a browser. The owner's admin calls
-- them as 'authenticated'.
revoke all on function reserve_stock(jsonb) from public, anon;
revoke all on function release_stock(jsonb) from public, anon;
grant execute on function reserve_stock(jsonb) to authenticated, service_role;
grant execute on function release_stock(jsonb) to authenticated, service_role;
