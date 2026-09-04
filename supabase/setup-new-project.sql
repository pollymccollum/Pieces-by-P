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
--   6. add-messages.sql
--   7. add-order-delete.sql
--   8. add-order-archive.sql
--   9. add-photo-focus.sql
--   10. add-charm-text.sql
--   11. add-email-status.sql
--   12. add-status-constraints.sql
--
-- Supabase will warn about "destructive operations". That is the
-- `drop policy if exists` and `create or replace function` lines, which
-- are there to make this file safely re-runnable. There is no
-- `drop table` or `delete from` anywhere in it.
--
-- DELIBERATELY EXCLUDED - do not run these as part of setup:
--   seed.sql — 12 fake pieces — dev only
--   seed-orders.sql — 8 fake customers and orders — dev only
--   add-contact-fields.sql — patches projects made before those columns existed
--   harden-stock-grants.sql — patches projects made before add-stock.sql revoked anon
--   cleanup-test-data.sql — run by hand at launch, not at setup
--   verify-rls.sql — a read-only check, run after this file
--   setup-new-project.sql — this file
--
-- After running this, run verify-rls.sql, then `npm run check:supabase`.
-- ============================================================


-- ==========================================================
-- [1/12]  schema.sql
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
-- [2/12]  rls.sql
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
-- [3/12]  storage.sql
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
-- [4/12]  layout-settings.sql
-- ==========================================================

-- ============================================================
-- PIECES BY P  |  Layout settings
-- Run once per Supabase project, after schema.sql.
-- Adds the section show/hide + ordering controls, per-field font choices,
-- the accent colour preset, and the header logo settings to the
-- site_settings row, so the admin's site editor has something to read
-- and write.
--
-- Uses || so it only fills in what's missing and never clobbers
-- wording Polly has already edited. Safe to re-run.
-- ============================================================

update site_settings
set data = jsonb_build_object(
  'accent', 'coral',
  'fonts', '{}'::jsonb,
  'logoUrl', null,
  'logoHeight', 40,
  'photoShape', 'square',
  'photoFit', 'cover',
  'gridSize', 'medium',
  'heroSize', 'medium',
  'heroLayout', 'side',
  'heroFit', 'cover',
  'sections', jsonb_build_array(
    jsonb_build_object('id', 'hero',    'show', true),
    jsonb_build_object('id', 'shop',    'show', true),
    jsonb_build_object('id', 'about',   'show', true),
    jsonb_build_object('id', 'contact', 'show', true)
  )
) || data
where id = 1;


-- ==========================================================
-- [5/12]  add-stock.sql
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


-- ==========================================================
-- [6/12]  add-messages.sql
-- ==========================================================

-- ============================================================
-- PIECES BY P  |  Contact form messages
-- Run once per project, after schema.sql. Safe to re-run.
--
-- The contact form saves here rather than only emailing. Two reasons:
--   1. It works whether or not email is configured — a message can never
--      be lost because a mail provider was down or not set up yet.
--   2. Polly gets one place to see enquiries, alongside her orders.
-- An email notification is sent as well when email is configured.
-- ============================================================

create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  body        text not null,
  handled     boolean not null default false,  -- she ticks these off
  created_at  timestamptz not null default now()
);
create index if not exists messages_created_idx on messages (created_at desc);

alter table messages enable row level security;

-- Anyone can send a message. Nobody but the owner can read them —
-- same shape as orders: public INSERT, owner SELECT/UPDATE.
drop policy if exists "public send message" on messages;
create policy "public send message"
  on messages for insert with check (true);

drop policy if exists "owner read messages" on messages;
create policy "owner read messages"
  on messages for select using (auth.role() = 'authenticated');

drop policy if exists "owner update messages" on messages;
create policy "owner update messages"
  on messages for update using (auth.role() = 'authenticated');

drop policy if exists "owner delete messages" on messages;
create policy "owner delete messages"
  on messages for delete using (auth.role() = 'authenticated');


-- ==========================================================
-- [7/12]  add-order-delete.sql
-- ==========================================================

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
-- checkout) and can never read, change, or remove one.
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


-- ==========================================================
-- [8/12]  add-order-archive.sql
-- ==========================================================

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


-- ==========================================================
-- [9/12]  add-photo-focus.sql
-- ==========================================================

-- ============================================================
-- PIECES BY P  |  Let the owner position each photo in its tile
-- Run once, on every project. Safe to re-run.
--
-- The shop grid crops photos to a fixed shape, and the crop defaults to
-- the middle of the image. That is wrong as often as it is right: a
-- necklace photographed slightly off-centre loses its pendant, and the
-- only fix was re-cropping the file and re-uploading it.
--
-- These two numbers are a focal point in percent — the part of the photo
-- that must stay visible when the tile crops. They feed CSS object-position
-- directly, so nothing is ever written to the image file: the original
-- upload is untouched and she can reposition as many times as she likes.
--
-- 50/50 is dead centre, which is exactly today's behaviour, so existing
-- photos look identical until she moves one.
--
-- No new RLS policy needed: rls.sql already grants the owner ALL on
-- product_images.
-- ============================================================

alter table product_images
  add column if not exists focal_x smallint not null default 50,
  add column if not exists focal_y smallint not null default 50,
  -- Zoom as a percentage. 100 = the photo exactly fills the tile.
  --
  -- Zoom is what makes panning work in both directions. At 100 a portrait
  -- photo in a square tile is already exactly as wide as the frame, so there
  -- is nothing hidden to the left or right to slide into view and only the
  -- vertical crop can be chosen. Above 100 the photo overflows on both axes
  -- and she can move it anywhere.
  add column if not exists zoom smallint not null default 100;

-- Percentages. Anything outside 0–100 would be a bug in the admin, not a
-- crop the owner chose, so the database refuses it.
alter table product_images
  drop constraint if exists product_images_focal_range;

alter table product_images
  add constraint product_images_focal_range
  check (
    focal_x between 0 and 100
    and focal_y between 0 and 100
    -- Past 3x, a phone photo of a small piece is visibly mushy. The admin
    -- stops at the same place.
    and zoom between 100 and 300
  );

-- Verify: expect three rows, all smallint (50 / 50 / 100)
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'product_images'
  and column_name in ('focal_x', 'focal_y', 'zoom')
order by column_name;


-- ==========================================================
-- [10/12]  add-charm-text.sql
-- ==========================================================

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


-- ==========================================================
-- [11/12]  add-email-status.sql
-- ==========================================================

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


-- ==========================================================
-- [12/12]  add-status-constraints.sql
-- ==========================================================

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
