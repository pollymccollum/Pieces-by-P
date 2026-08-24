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
