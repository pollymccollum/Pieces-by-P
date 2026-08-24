# Pieces by P

E-commerce site for **Pieces by P**, a handmade beaded jewelry business (owner: Polly McCollum, Anderson, SC). Custom storefront plus an owner admin, built so Polly can run it herself with no code.

See [BUILD-BRIEF.md](BUILD-BRIEF.md) for the full spec and decisions, and
[LAUNCH.md](LAUNCH.md) for the launch checklist, the accounts that must be
created in the owner's name, and what everything costs.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Supabase** — Postgres, Auth (owner login), Storage (product photos)
- **Stripe Checkout** — card payments (phase 2)
- **Netlify** — hosting

All account-specific values come from `.env` — linking accounts is pasting values, never editing code.

## Build phases

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Storefront reading products + content from Supabase | **done** |
| 2 | Admin: login, orders, product manager, site content editor | **done** |
| 2b | Venmo checkout + manual order entry (shop takes real orders) | **done** |
| 3 | Stripe Checkout + webhook (test mode) | not started |
| 4 | Launch: owner's accounts, real domain, Stripe live mode | not started |

The admin was built before Stripe, swapping BUILD-BRIEF.md's order: it is the
brief's #1 priority, has no dependency on payments, and lets the owner load her
real pieces while checkout is being built. The orders page reads the `orders`
and `order_items` tables directly, so the Stripe webhook only has to write rows
into the existing schema for orders to start appearing.

## Local setup

### 1. Create a Supabase project

Free tier is fine. For development this can be a throwaway project under any
login; **at launch it must be created under Polly's own account** so she isn't
locked out of her own data.

### 2. Run the SQL, in this order

In the Supabase dashboard: **SQL Editor → New query**, paste each file, run it.

| File | What it does |
| --- | --- |
| [supabase/schema.sql](supabase/schema.sql) | Tables, indexes, default settings row |
| [supabase/seed.sql](supabase/seed.sql) | Dev sample content + 12 sample pieces (**dev only**) |
| [supabase/seed-orders.sql](supabase/seed-orders.sql) | 8 fake card + Venmo orders to preview the orders page (**dev only**) |
| [supabase/rls.sql](supabase/rls.sql) | Row Level Security — public reads, owner-only writes |
| [supabase/storage.sql](supabase/storage.sql) | Photo bucket + upload permissions |
| [supabase/layout-settings.sql](supabase/layout-settings.sql) | Section order/visibility + accent colour defaults |
| [supabase/verify-rls.sql](supabase/verify-rls.sql) | Read-only check that RLS actually applied |
| [supabase/add-contact-fields.sql](supabase/add-contact-fields.sql) | Migration — only for projects created before Instagram/optional-email |
| [supabase/add-stock.sql](supabase/add-stock.sql) | Stock column + `reserve_stock`/`release_stock` functions (**required**) |

Skip both seed files on Polly's real project: she enters her own pieces and
copy through the admin, and fake orders must never reach a live shop.
`seed-orders.sql` carries its own cleanup statement at the bottom.

### 3. Configure the environment

Copy the template and fill in the Supabase values from **Settings → API**:

```bash
cp .env.example .env.local
```

Phase 1 needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
The admin also needs `ADMIN_EMAIL`. Stripe values come in phase 2.

### 3b. Create the owner login

The admin is gated to a single account. In the Supabase dashboard go to
**Authentication → Users → Add user**, create one with a password, confirm
the email, then set `ADMIN_EMAIL` in `.env.local` to that same address and
restart the dev server. Any other account is refused even if it can
authenticate — see `lib/auth.ts`.

### 4. Verify and run

```bash
npm install
npm run check:supabase   # confirms schema, seed, and RLS are all in place
npm run dev              # http://localhost:3000
```

## Email

Four transactional emails, all automatic — the owner never sends one by hand:

| Email | Sent when | To |
| --- | --- | --- |
| Order confirmation | Checkout completes (repeats Venmo amount + order number) | Customer |
| New order alert | Checkout completes (not for manually-entered orders) | Owner |
| Payment received | Owner marks a Venmo order paid | Customer |
| Shipped | Owner taps **Shipped** on an order | Customer |

Sent through [Resend](https://resend.com). Set `RESEND_API_KEY` and
`EMAIL_FROM` to switch them on; leave either blank and every send quietly
no-ops, so the site runs fine without them. Sending failures are logged and
swallowed — **an email must never fail an order**.

At launch, the Resend account is created in the owner's name (like Supabase
and Stripe), and `EMAIL_FROM` moves from Resend's test sender to a verified
address on the real domain.

## Project layout

```
app/page.tsx                storefront; server-fetches then renders
app/admin/                  owner area — login, orders, pieces, content editor
app/admin/actions.ts        server actions; every one calls requireOwner()
components/storefront/      the UI, ported from the approved design preview
lib/auth.ts                 requireOwner() — the admin security boundary
lib/data.ts                 Supabase reads (site settings, products + photos)
lib/types.ts                types mirroring the database schema
proxy.ts                    keeps the owner's session fresh (not a security check)
supabase/                   schema, dev seed, RLS, storage, layout settings
scripts/check-supabase.mjs  setup verification
```

## Conventions worth knowing

- **Money is stored in integer cents** everywhere (database and app), matching
  how Stripe expects amounts. `lib/format.ts` handles display.
- **Email is required at checkout; phone and Instagram are optional.** Email
  is the channel every transactional message uses, so the emails are only
  dependable if every order has one. `customer_email` stays *nullable in the
  database* on purpose — orders predating this rule exist, and nothing should
  crash on them — so code reading it must still handle `null`.
- **Stock is optional per piece and reserved in the database.** `stock` is
  `null` by default, meaning made-to-order/unlimited — most handmade pieces
  are. Where it is set, checkout calls the `reserve_stock()` SQL function
  rather than reading-then-writing from the app: the decrement is a single
  atomic `UPDATE ... WHERE stock >= qty`, so two shoppers racing for the last
  piece can't both win. It's `SECURITY DEFINER` because anon deliberately has
  no `UPDATE` on products. Stock drops when the order is **placed**, not when
  it's paid, so an unpaid Venmo order still holds its pieces; if a customer
  never pays, Polly raises the number again in the admin.
- **Never trust a price from the browser.** `priceOrder()` in
  `lib/order-utils.ts` rebuilds every order from database prices and the
  shipping rules in `site_settings`; the client only ever sends product ids,
  quantities, and notes. Both the public checkout and the admin's manual order
  entry go through it, so the two can't drift apart.
- **Anonymous checkout writes but never reads.** RLS grants anon `INSERT` on
  `orders`/`order_items` and no `SELECT`, so `placeVenmoOrder` generates the
  row id itself instead of using `.insert().select()`, which would come back
  empty under those policies. Verified: anon can place an order and cannot
  read any order back.
- **No hardcoded content.** All copy, prices, and pieces come from the
  database so Polly can edit them without a developer.
- **Photos fall back to illustrations.** A piece with no uploaded photo renders
  the beaded-strand SVG in its own colors, so the grid never looks broken.
- `pieces-by-p-store.jsx` and `pieces-by-p-orders-admin.jsx` in the repo root
  are the **design references** — not application code, and excluded from lint.
- **Auth checks go next to the data, never in a layout.** Next.js layouts don't
  re-render on navigation and don't stop child routes or server actions from
  running. Every admin page and every server action calls `requireOwner()`.
- **The admin never uses the service-role key.** It acts as the logged-in owner,
  so the RLS policies are what authorise each write.
- **Card payment status is Stripe's, not the admin's.** `setPaymentStatus` in
  `app/admin/actions.ts` refuses any order whose `payment_method` is `card`,
  server-side, not just by hiding the button. Only off-site methods (Venmo,
  cash) can be marked paid by hand — see `MANUAL_PAYMENT_METHODS` in
  `lib/types.ts`, which is where a future method like Cash App would be added.
- **Appearance settings are CSS custom properties, not conditional markup.**
  Photo shape, crop, grid density, hero height, and accent colour are written
  as `--tile-ratio`, `--photo-fit`, `--cols-*`, `--hero-h-*`, and `--coral` on
  the storefront root; `globals.css` reads them with the original design as
  fallbacks. A missing or partial settings row therefore renders correctly
  rather than breaking, and adding a preset means editing `lib/types.ts` only.
- **What the owner can change vs. what needs a developer.** She controls all
  wording, photos, her header logo, prices, categories, shipping, section
  order/visibility, photo shape/crop/size, hero height, and the accent colour.
  The palette, fonts, and page structure are code
  (`app/globals.css`, `app/layout.tsx`) — deliberately, so the design stays
  intact. Reskinning is a small, low-risk edit to the CSS variables.
