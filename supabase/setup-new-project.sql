-- ============================================================
-- PIECES BY P  |  COMPLETE SETUP FOR A NEW SUPABASE PROJECT
--
-- GENERATED FILE - do not edit by hand.
-- Regenerate with:  npm run build:setup-sql
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- It contains, in the required order:
--   1. schema.sql
--   2. rls.sql
--   3. storage.sql
--   4. layout-settings.sql
--   5. add-stock.sql
--
-- Supabase will warn about "destructive operations". That is the
-- `drop policy if exists` and `create or replace function` lines, which
-- are there to make this file safely re-runnable. There is no
-- `drop table` or `delete from` anywhere in it.
--
-- DELIBERATELY EXCLUDED - never run these on a real shop:
--   seed.sql
--   seed-orders.sql
--   add-contact-fields.sql
--
-- After running this, run verify-rls.sql, then `npm run check:supabase`.
-- ============================================================


-- ==========================================================
-- [1/5]  schema.sql
-- ==========================================================

-- ============================================================
-- PIECES BY P  |  Database schema (PostgreSQL)
-- Runs as-is on Supabase or Neon (both are Postgres).
-- Built for: Venmo orders now, Stripe card payments as a drop-in later.
-- Money is stored in whole cents (integers) to avoid rounding bugs
-- and to line up with how Stripe expects amounts.
-- ============================================================

create extension if not exists "pgcrypto";  -- enables gen_random_uuid()

-- ------------------------------------------------------------
-- 1. SITE CONTENT
-- One editable row holding all the words and shop settings
-- (brand name, announcement, hero + about + contact copy,
--  Venmo handle, shipping rules, category list).
-- The admin page reads and writes this single row.
-- ------------------------------------------------------------
create table if not exists site_settings (
  id          integer primary key default 1,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

-- ------------------------------------------------------------
-- 2. PRODUCTS
-- ------------------------------------------------------------
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category     text not null default 'Necklaces',
  price_cents  integer not null default 0 check (price_cents >= 0),
  material     text default '',
  description  text default '',
  tag          text,                       -- 'New', 'Bestseller', ... null = none
  charm        text default 'heart',       -- fallback illustration when no photo
  colors       jsonb default '[]'::jsonb,  -- fallback bead colors when no photo
  custom       boolean not null default true,  -- show "make it yours" field
  -- null = made to order, unlimited (the default); 0 = sold out; N = N left.
  -- Reserved at checkout by reserve_stock() — see add-stock.sql.
  stock        integer check (stock is null or stock >= 0),
  active       boolean not null default true,  -- hide a piece without deleting it
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_sort_idx on products (sort_order, created_at);

-- ------------------------------------------------------------
-- 3. PRODUCT PHOTOS
-- One row per uploaded photo. url points to your image storage
-- (Supabase Storage or Cloudinary, depending on the path chosen).
-- ------------------------------------------------------------
create table if not exists product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  url         text not null,
  sort_order  integer not null default 0,  -- first photo is the cover
  created_at  timestamptz not null default now()
);
create index if not exists product_images_product_idx on product_images (product_id, sort_order);

-- ------------------------------------------------------------
-- 4. ORDERS
-- payment_method starts as 'venmo'. When card payments turn on,
-- new orders come in as 'card' and a Stripe webhook flips
-- payment_status to 'paid'. No schema change needed, which is
-- what makes card payments a drop-in later.
-- ------------------------------------------------------------
create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique,
  customer_name       text not null,
  -- Contact: at least one of these three is required, enforced in the app
  -- (lib/order-utils.ts). None is individually mandatory, so a customer
  -- without Instagram — or without email — can still order.
  customer_email      text,
  customer_phone      text,
  customer_instagram  text,          -- handle without the @
  address1            text not null,
  address2            text,
  city                text not null,
  state               text not null,
  zip                 text not null,
  country             text not null default 'United States',
  notes               text,
  subtotal_cents      integer not null default 0,
  shipping_cents      integer not null default 0,
  total_cents         integer not null default 0,
  payment_method      text not null default 'venmo',    -- 'venmo' | 'card'
  payment_status      text not null default 'pending',  -- 'pending' | 'paid' | 'refunded'
  fulfillment_status  text not null default 'new',      -- 'new' | 'making' | 'shipped'
  stripe_session_id   text,          -- filled in later when Stripe is added
  paid_at             timestamptz,   -- set when Polly marks paid, or by Stripe
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (payment_status, fulfillment_status);

-- ------------------------------------------------------------
-- 5. ORDER LINE ITEMS
-- product_name and unit_price are snapshotted so the order log
-- stays correct even if the piece is later edited or deleted.
-- customization holds the customer's "make it yours" request.
-- ------------------------------------------------------------
create table if not exists order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders(id) on delete cascade,
  product_id        uuid references products(id) on delete set null,
  product_name      text not null,
  unit_price_cents  integer not null,
  quantity          integer not null default 1 check (quantity > 0),
  customization     text,
  line_total_cents  integer not null
);
create index if not exists order_items_order_idx on order_items (order_id);

-- ------------------------------------------------------------
-- SEED: default site settings (Polly edits these in the admin).
-- Set venmoHandle to her real Venmo before launch.
-- ------------------------------------------------------------
insert into site_settings (id, data) values (1, jsonb_build_object(
  'brand', 'Pieces by P',
  'announce', 'Handmade to order in Anderson, SC',
  'venmoHandle', '@your-venmo',
  'freeShipOver', 50,
  'flatShip', 5,
  'categories', jsonb_build_array('Necklaces', 'Bracelets', 'Chokers', 'Charms')
)) on conflict (id) do nothing;

-- ============================================================
-- OPTIONAL: Supabase Row Level Security
-- Only for the Supabase path. It makes storefront data public to
-- read, lets anyone place an order, and locks all edits and order
-- viewing to the logged-in owner. On the Neon path your API layer
-- enforces the same rules, so skip this block there.
-- Since Polly is the only account that ever logs in, 'authenticated'
-- effectively means "the owner".
-- ============================================================
-- alter table site_settings  enable row level security;
-- alter table products       enable row level security;
-- alter table product_images enable row level security;
-- alter table orders         enable row level security;
-- alter table order_items    enable row level security;
--
-- create policy "public read settings"      on site_settings  for select using (true);
-- create policy "public read products"      on products       for select using (active = true);
-- create policy "public read images"        on product_images for select using (true);
-- create policy "public place order"        on orders         for insert with check (true);
-- create policy "public add order items"    on order_items    for insert with check (true);
--
-- create policy "owner all settings"  on site_settings  for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- create policy "owner all products"  on products       for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- create policy "owner all images"    on product_images for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- create policy "owner read orders"   on orders         for select using (auth.role() = 'authenticated');
-- create policy "owner update orders" on orders         for update using (auth.role() = 'authenticated');
-- create policy "owner read items"    on order_items    for select using (auth.role() = 'authenticated');


-- ==========================================================
-- [2/5]  rls.sql
-- ==========================================================

-- ============================================================
-- PIECES BY P  |  Row Level Security
-- Run this AFTER schema.sql, on every Supabase project (dev and,
-- at launch, Polly's real one).
--
-- What it enforces:
--   * anyone can read site content and ACTIVE products/photos
--   * anyone can place an order (insert only)
--   * only the logged-in owner can edit anything or read orders
--
-- Polly is the only account that ever logs in, so 'authenticated'
-- effectively means "the owner". This is the same block that ships
-- commented-out at the bottom of schema.sql, pulled into its own
-- runnable file.
-- ============================================================

alter table site_settings  enable row level security;
alter table products       enable row level security;
alter table product_images enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;

-- ---- public (anon key, used by the storefront) ----
create policy "public read settings"   on site_settings  for select using (true);
create policy "public read products"   on products       for select using (active = true);
create policy "public read images"     on product_images for select using (true);
create policy "public place order"     on orders         for insert with check (true);
create policy "public add order items" on order_items    for insert with check (true);

-- ---- owner (logged in via Supabase Auth at /admin) ----
create policy "owner all settings"  on site_settings  for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "owner all products"  on products       for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "owner all images"    on product_images for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "owner read orders"   on orders         for select using (auth.role() = 'authenticated');
create policy "owner update orders" on orders         for update using (auth.role() = 'authenticated');
create policy "owner read items"    on order_items    for select using (auth.role() = 'authenticated');


-- ==========================================================
-- [3/5]  storage.sql
-- ==========================================================

-- ============================================================
-- PIECES BY P  |  Photo storage
-- Run once per Supabase project, after schema.sql.
-- Creates the bucket product photos are uploaded into from the
-- admin, and locks writes to the logged-in owner.
--
-- The bucket is PUBLIC for reading: storefront photos need to load
-- for anonymous shoppers. Only Polly (authenticated) can upload,
-- replace, or delete.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do update set public = true;

-- Anyone can view photos (they appear on the public storefront).
drop policy if exists "public view photos" on storage.objects;
create policy "public view photos"
  on storage.objects for select
  using (bucket_id = 'product-photos');

-- Only the owner can add, change, or remove them.
drop policy if exists "owner upload photos" on storage.objects;
create policy "owner upload photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos');

drop policy if exists "owner update photos" on storage.objects;
create policy "owner update photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-photos');

drop policy if exists "owner delete photos" on storage.objects;
create policy "owner delete photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos');


-- ==========================================================
-- [4/5]  layout-settings.sql
-- ==========================================================

-- ============================================================
-- PIECES BY P  |  Layout settings
-- Run once per Supabase project, after schema.sql.
-- Adds the section show/hide + ordering controls, the accent colour
-- preset, and the header logo settings to the site_settings row, so
-- the admin's site editor has something to read and write.
--
-- Uses || so it only fills in what's missing and never clobbers
-- wording Polly has already edited. Safe to re-run.
-- ============================================================

update site_settings
set data = jsonb_build_object(
  'accent', 'coral',
  'logoUrl', null,
  'logoHeight', 40,
  'photoShape', 'square',
  'photoFit', 'cover',
  'gridSize', 'medium',
  'heroSize', 'medium',
  'sections', jsonb_build_array(
    jsonb_build_object('id', 'hero',    'show', true),
    jsonb_build_object('id', 'shop',    'show', true),
    jsonb_build_object('id', 'about',   'show', true),
    jsonb_build_object('id', 'contact', 'show', true)
  )
) || data
where id = 1;


-- ==========================================================
-- [5/5]  add-stock.sql
-- ==========================================================

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

revoke all on function reserve_stock(jsonb) from public;
revoke all on function release_stock(jsonb) from public;
grant execute on function reserve_stock(jsonb) to anon, authenticated;
grant execute on function release_stock(jsonb) to anon, authenticated;
