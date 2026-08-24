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
