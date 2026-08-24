# Pieces by P — Build Brief

Paste this into Claude Code as the kickoff context. It captures every decision already made so the build starts fully informed.

## What this is
An e-commerce website for **Pieces by P**, a handmade beaded jewelry business (owner: Polly McCollum, Anderson, SC, @shop.piecesbyp). A custom storefront plus an owner admin. The whole point is that it looks custom and on-brand, but Polly can run it herself with no code, and it hands off cleanly to her.

## Priorities (in order)
1. Owner can manage everything herself: photos, prices, all site wording, and pieces.
2. An orders page that is dead simple: who ordered, which pieces (with custom notes), the total, paid or not, and where to ship.
3. Card payments via Stripe, money to her bank.
4. Cheap to run and clean to hand off (all accounts in her name).

## Stack
- **Next.js** (App Router, TypeScript).
- **Supabase**: Postgres database, Auth (owner login), and Storage (product photos).
- **Stripe Checkout** (hosted payment page) for cards, with a webhook.
- **Netlify** hosting (its free tier permits commercial use).
- All account-specific values come from `.env` (see `.env.example`). Build and test with a throwaway dev Supabase project and Stripe **test mode**. Swap to the owner's real keys and Stripe **live mode** at launch. Linking her accounts should be pasting values, never editing code.

## Data model
Use `schema.sql` as provided (already written, host-agnostic Postgres). Key points:
- Tables: `site_settings` (one JSONB row of all editable copy + settings), `products`, `product_images` (URLs to Supabase Storage), `orders`, `order_items`.
- Money is stored in integer **cents**.
- Orders carry `payment_method` ('card'), `payment_status` ('pending' | 'paid' | 'refunded'), `fulfillment_status` ('new' | 'making' | 'shipped'). The Stripe webhook sets status to 'paid'. `order_items.customization` holds the customer's "make it yours" note.

## Design system (match the approved preview `pieces-by-p-store.jsx`)
- Palette: cream `#FAF6EC`, deeper cream `#F2EBD8`, surface `#FFFDF7`, ink `#2B2A24`, soft ink `#6E6A5C`, sage `#A8BF83`, deep sage `#6E7F49`, soft sage `#DEE7C8`, gold `#C79A3E`, hairline `#E7E0CD`, coral accent `#E4573B`.
- Type: **Fraunces** (serif display, letterspaced caps for the wordmark), **Poppins** (sans body/UI), **Dancing Script** (script accent, used sparingly).
- Motifs: a circular sage "P" badge (echoes her logo), a gold puffy-heart charm as the recurring accent, and a colorful beaded-strand SVG illustration used as the product-photo fallback until a real photo is uploaded.
- `pieces-by-p-store.jsx` is the visual source of truth for the storefront. `pieces-by-p-orders-admin.jsx` is the layout source of truth for the orders page.

## Features to build

**Storefront (public)**
- Hero, category filter, product grid, product detail (photo gallery + description + materials + an optional "make it yours" customization field), cart, contact section, footer.
- Reads products, photos, and all copy from the database (no hardcoded content).
- Cart to **Stripe Checkout**: create a checkout session server-side, redirect to Stripe, return to a success/cancel page. Collect the shipping address in Stripe Checkout (or in a step before it) so it lands on the order.

**Checkout + webhook**
- API route to create the Checkout session from the cart.
- Stripe webhook route that, on successful payment, writes the order + line items + shipping address into the database and sets `payment_status = 'paid'`. Include the customization notes per line.

**Admin (`/admin`, gated by Supabase Auth to `ADMIN_EMAIL` only)**
- **Orders page** (the priority, match the mockup): orders newest first, summary counts at top (new / making / shipped / paid this week), and a self-contained card per order showing customer, pieces with quantities and customization notes, total, payment badge, and the ship-to address with a one-tap copy. A status control moves each order New -> Making -> Shipped. Mobile-first, since she checks it on her phone.
- **Product manager**: add / edit / delete / reorder pieces, upload photos to Supabase Storage, edit prices and categories.
- **Site content editor**: edit all wording (announcement, hero, about, contact) and shipping settings, saved to `site_settings`.

## Build order (phases)
1. Storefront running on the database (dev Supabase).
2. Stripe Checkout + webhook, tested in Stripe test mode with fake cards.
3. Admin: login, orders page, product manager, content editor.
4. Launch: create the owner's accounts, run the schema on her Supabase, deploy to her Netlify, point the domain, swap Stripe to live, run one real test order.

## Handoff notes
- Every account (Stripe, Supabase, Netlify, domain) is created in the owner's name and email; the builder just does the clicking. Logins live in her password manager.
- Stripe verifies her identity and bank before live payouts, and the first payout runs on a delay, so start her Stripe signup a few days before launch.

## Files to keep in the repo as references
- `schema.sql` — the database schema, run this in Supabase.
- `.env.example` — the config values to fill in at launch.
- `pieces-by-p-store.jsx` — storefront design reference.
- `pieces-by-p-orders-admin.jsx` — orders page design reference.
