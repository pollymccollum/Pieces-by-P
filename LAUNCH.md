# Launch checklist & running costs

Everything that has to happen **with Polly** before the shop goes live, plus
what it all costs.

Keep this file updated as items get done — it's the handoff record.

> **Pricing note:** figures below are list prices as last checked and are
> here for budgeting, not as a quote. Providers change pricing; confirm on
> each site at signup. Every service is billed in USD.

---

## 1. Accounts to create in Polly's name

The rule from BUILD-BRIEF.md: **every production account is created under
Polly's own email and password.** Not Jack's, not a shared login. If an
account is under someone else's name, she can be locked out of her own
business.

Jack's dev accounts (the current Supabase project, Resend, Stripe test mode)
are throwaways. **None of them carry over.** They get deleted after launch.

| # | Account | What it's for | Who must do it | Status |
|---|---------|---------------|----------------|--------|
| 1 | **GitHub** | Stores the code Netlify builds from | Polly creates, then never touches it | ☐ |
| 2 | **Supabase** | Database — products, orders, site wording, photos | Polly creates, Jack configures | ☐ |
| 3 | **Stripe** | Card payments | **Polly only** — identity + bank | ☐ |
| 4 | **Resend** | Confirmation / shipped emails | Polly creates, Jack configures | ☐ |
| 5 | **Netlify** | Hosting the website | Polly creates, Jack deploys | ☐ |
| 6 | **Domain registrar** | `piecesbyp.com` (or chosen name) | Polly buys | ☐ |
| 7 | **Venmo business profile** | Venmo orders | **Polly only** — her identity | ☐ |

### Why Polly needs a GitHub account she'll never open

She will genuinely never use it — no code, no commits, nothing. But the repo
is where the site's code lives, and Netlify builds from it. It's the deed to
the house: you don't read it daily, but your name has to be on it.

If the repo stayed under Jack's account, the site would keep running and
keep taking orders — but if Jack ever became unreachable, Polly could not
hand the code to another developer. She'd own her data, payments, domain,
and hosting, and still be unable to change how the site works. That's the
one gap that would actually strand her.

Setup: she creates the account (free, ~5 minutes), the repo is transferred
to her, and she adds Jack as a collaborator. She stores the password and
forgets about it.

### What Polly needs to hand over (or enter herself)

For each account, Jack needs the **API keys only** — never her passwords:

- Supabase → Project URL + publishable key
- Stripe → publishable key + secret key + webhook signing secret
- Resend → API key
- Netlify → she just adds Jack as a collaborator, or pastes the keys herself

Best practice: sit together and have **her** type the passwords, then paste
the keys into the deploy settings. She keeps every password in her own
password manager.

---

## 2. Things only Polly can do

These cannot be delegated — they're tied to her legal identity:

- [ ] **Stripe identity verification.** Legal name, address, date of birth,
      last 4 of SSN, and a bank account for payouts. Stripe may ask for a
      photo ID. **Start this 3–5 business days before launch** — verification
      is not instant, and the shop can't take card payments until it clears.
- [ ] **Venmo business profile.** Using a *personal* Venmo account for
      business income is against Venmo's terms and risks the account being
      frozen. A business profile is the correct route (see fees below).
- [ ] **Bank account details** for both Stripe and Venmo payouts.
- [ ] **Decide the shop email address** (e.g. `hello@piecesbyp.com`) — used as
      the reply-to on customer emails.

---

## 3. Launch sequence

Rough order of operations. Items marked ⏳ have a waiting period.

> **Progress:** domain bought; GitHub repo live at
> `github.com/pollymccollum/Pieces-by-P` (private, Jack a collaborator);
> Supabase project created and all SQL run and verified; Polly's admin
> login created. Next: Resend, then Netlify deploy.

**Start early — these have waiting periods**

1. [ ] ⏳ Polly creates Stripe account and completes identity verification (3–5 business days)
2. [x] Buy the domain

**Accounts and setup**

3. [x] Polly creates a GitHub account; transfer the repo to her, add Jack as collaborator
4. [x] Polly creates Supabase project (free tier)
5. [x] Jack runs these five in the Supabase SQL Editor, **in this order**:
       `schema.sql` → `rls.sql` → `storage.sql` → `layout-settings.sql` → `add-stock.sql`
       - **Do not run** `seed.sql` or `seed-orders.sql` — fake pieces and fake
         customers, dev only.
       - **Do not run** `add-contact-fields.sql` — it only patches projects
         made before those columns existed; `schema.sql` already includes them.
       - `add-stock.sql` **is** required despite its name: the stock functions
         checkout depends on live only in that file.
6. [x] Jack runs `verify-rls.sql`, then `npm run check:supabase` — both should come back clean
7. [x] Polly creates her admin login (Supabase → Authentication → Users)
8. [ ] Polly creates Resend account
9. [ ] ⏳ Verify the domain in Resend (2 DNS records; propagation can take hours)
10. [ ] Polly creates Netlify account
11. [ ] Jack deploys, sets all environment variables in Netlify
12. [ ] Point the domain at Netlify

**Polly's content — the longest job, can start as soon as step 11 is done**

13. [ ] **Polly loads her real pieces** — photos, prices, descriptions, stock
14. [ ] Polly writes her own About text, contact details, Venmo handle, logo

**Smoke test — before telling anyone the shop is open**

Do this on her real setup, with Stripe still in **test** mode. Every one of
these paths works in development; the point is proving they work with *her*
accounts and *her* keys.

15. [ ] Card order with test card `4242 4242 4242 4242` → lands in her admin as **Paid**
16. [ ] Venmo order → lands as **Unpaid**; tap **Mark paid** and it flips
17. [ ] **Emails — the least-tested part of the system.** Confirm all four arrive:
        - order confirmation (to the customer)
        - new-order alert (to Polly)
        - payment received (after tapping Mark paid)
        - shipped (after tapping Shipped)
        Check the spam folder too — a brand-new sending domain often lands
        there for the first few messages.
18. [ ] Set a piece's stock to 1, buy it, confirm it flips to **SOLD OUT**
19. [ ] Open the shop on her phone — this is how most customers will see it
19b. [ ] Set up the free uptime monitor (section 7) — this is what stops
        Supabase pausing and taking the shop offline during a quiet week

**Go live**

20. [ ] Switch Stripe from test keys to live keys
21. [ ] Place one real order with a real card, then refund it from the Stripe dashboard
22. [ ] Delete Jack's dev accounts: Supabase project, Resend, Stripe test account

---

### Supabase setup, step by step

The expanded version of steps 4–7 above. This is the fiddliest part of launch
day, so it's written out in full.

**A. Create the project**

1. Polly signs up at [supabase.com](https://supabase.com) — **her** email or
   her own GitHub. Free tier.
2. New project. Name it `pieces-by-p`, click **Generate** for the database
   password, and save that password in her password manager. Pick the
   region closest to South Carolina (US East).
3. On the creation screen, under **Security**:
   - ✅ **Enable Data API** — leave ON. The site talks to this; without it
     nothing loads.
   - ✅ **Automatically expose new tables** — leave ON. Supabase suggests
     turning it off, but then the tables need manual grants and every query
     fails with "permission denied". `rls.sql` is what actually protects the
     data.
   - ✅ **Enable automatic RLS** — turn this ON (it's off by default). It
     guarantees no table can ever be exposed without row security.
4. Wait ~2 minutes for it to provision.

**B. Run the SQL — order matters**

**SQL Editor → New query**, paste each file, **Run**. Supabase will warn about
"destructive operations" on some of these; that's the `drop policy if exists`
and `create or replace function` lines, which are harmless — none of these
files contain `drop table` or `delete from`.

| # | File | What it does |
|---|------|--------------|
| 1 | `schema.sql` | Tables, indexes, default settings row |
| 2 | `rls.sql` | Row security — public reads, owner-only writes |
| 3 | `storage.sql` | Photo bucket + upload permissions |
| 4 | `layout-settings.sql` | Section order, accent colour, logo defaults |
| 5 | `add-stock.sql` | Stock functions — **required**, see below |

**Do NOT run:**

- `seed.sql` — 12 fake sample pieces. Dev only.
- `seed-orders.sql` — 8 fake customers and orders. Dev only.
- `add-contact-fields.sql` — patches projects created *before* the Instagram
  and optional-email columns existed. `schema.sql` already includes them, so
  running it on a new project is pointless (harmless, but pointless).

⚠️ **`add-stock.sql` is required despite sounding like a patch.** `schema.sql`
creates the stock *column*; the `reserve_stock()` / `release_stock()`
*functions* exist only in that file, and checkout calls them. Skip it and
placing an order fails.

**C. Owner login**

5. **Authentication → Users → Add user**. Polly's email, a password she
   chooses, and tick to auto-confirm the email.
6. Set `ADMIN_EMAIL` to that same address in the Netlify environment
   variables. Any other account is refused even if it can authenticate.

**D. Keys**

7. **Project Settings → API Keys** (or the **Connect** button → App
   Frameworks → Next.js). Copy:
   - **Project URL** — base only, e.g. `https://abcd.supabase.co`.
     **Not** the `/rest/v1/` version; the client appends that itself.
   - **Publishable / anon key** — `sb_publishable_...` or `eyJ...`. Either
     works.
   - **Never** the secret / `service_role` key. This project doesn't use it.

**E. Verify before moving on**

8. Run `verify-rls.sql` — every table should show `rls_enabled = true` with a
   non-zero policy count.
9. Run `npm run check:supabase` — checks schema, seed state, storage bucket,
   contact columns, stock functions, email config, and the admin gate in one
   go. Fix anything it flags before deploying.

---

## 4. What it costs

### 4a. Fixed monthly costs

| Service | Free tier | Free tier limits | Paid tier | Paid price |
|---------|-----------|------------------|-----------|-----------|
| **GitHub** | Yes | Unlimited private repos. **Free covers this project permanently** — the paid tiers are for organisations | Team | $4 / user / month |
| **Supabase** | Yes | 500 MB database, 1 GB file storage, 5 GB bandwidth/mo. Pauses after ~7 days with zero traffic | Pro | **$25 / month** |
| **Netlify** | Yes | 100 GB bandwidth/mo, 300 build minutes/mo | Pro | **$19 / month** (per member) |
| **Resend** | Yes | 3,000 emails/mo, 100/day, 1 domain | Pro | **$20 / month** |
| **Stripe** | — | No free/paid tiers; per-transaction only | — | **$0 / month** |
| **Venmo** | — | No monthly fee | — | **$0 / month** |
| **Domain** | No free option | — | Required | **~$12–15 / year** (~$1.25/mo) |

**Monthly totals**

| Scenario | Monthly | Yearly |
|----------|---------|--------|
| **All free tiers** (+ domain) | **~$1.25** | **~$15** |
| **All paid tiers** (+ domain) | **~$65.25** | **~$783** |

Breakdown of the all-paid figure: Supabase $25 + Netlify $19 + Resend $20 =
**$64/month**, plus the domain at ~$15/year. GitHub is excluded because its
free tier covers a project like this permanently — there is no version of
this shop that needs GitHub Team.

### 4b. Transaction fees (unavoidable, both tiers)

These apply whether or not she upgrades anything.

| Method | Fee | On a $42 necklace | She keeps |
|--------|-----|-------------------|-----------|
| **Stripe** (card) | 2.9% + $0.30 | $1.52 | **$40.48** |
| **Venmo** (business profile) | 1.9% + $0.10 | $0.90 | **$41.10** |

Other Stripe charges worth knowing: international cards add ~1.5%, currency
conversion ~1%, and a disputed charge costs $15 regardless of outcome.
Venmo business profiles have no monthly fee.

**Worked example — 20 orders a month averaging $45 ($900 revenue):**

| All payments via | Fees | Net |
|------------------|------|-----|
| Stripe | ~$32.10 | ~$867.90 |
| Venmo | ~$19.10 | ~$880.90 |

Venmo is cheaper per sale, but it's manual — she confirms each payment
herself. Card is automatic and most customers expect it. Offering both is
why the site supports both.

---

## 5. Honest recommendation

**Start on the free tiers. Don't pre-pay for anything.**

For a handmade jewellery shop the free limits are not close to binding:

- **Supabase** — 500 MB holds a staggering number of orders. The real limit
  is the 1 GB of photo storage, roughly 300–500 product photos depending on
  size. The "pauses after 7 days" rule only bites a site with *no* visitors;
  a live shop won't hit it.
- **Netlify** — 100 GB/month is far more traffic than a new shop sees.
- **Resend** — 3,000 emails/month is around 750 orders, since each order
  sends up to 4 emails. She won't be near that.

So the realistic running cost is **the domain (~$12–15/year) plus transaction
fees on actual sales.** Nothing else, quite possibly for years.

**Upgrade only when a real limit is hit** — Supabase Pro first, and only if
photo storage fills up. That's a good problem, and it means the shop is
selling.

---

## 6. How this actually fits together

Worth being clear on, because it's what makes the handover simple.

```
   JACK'S LAPTOP             GITHUB               NETLIFY
   (VS Code)           (the code, stored)   (runs the website 24/7)
   a working copy  --push-->  master  --auto-deploy-->  piecesbyp.com
                                                             |
                                                             | reads / writes
                                                             v
                                                        SUPABASE
                                                     (the database:
                                                   products, orders,
                                                    wording, photos)
                                                             ^
                                                             | edits via /admin
                                                             |
                                                     POLLY'S PHONE
```

**The live site does not run on anyone's laptop.** It runs on Netlify, from
code in GitHub. A developer's local folder is a working copy — it matters only
while someone is actively changing the code, and the site runs fine whether
that machine is on, off, or thrown away.

**Code and content are separate, and that's the point:**

| | Lives in | Changed by | Needs a developer? |
|---|---|---|---|
| **Content** — pieces, photos, prices, stock, all site wording, logo, colours, section order | Supabase | Polly, at `/admin` | **No** |
| **Code** — how the site behaves; new features | GitHub | A developer, via push | Yes |

**Access is controlled by keys, not by who has the code.** The code isn't
secret; the `.env` values (Supabase, Stripe, Resend keys) are. After handover
Jack has access only while Polly grants it — as a GitHub collaborator, or by
sharing specific keys for a specific job. Remove that and a local copy is
inert. This is deliberate: it's what makes her ownership real.

**Nothing migrates.** The dev database's sample pieces are throwaway. Polly
enters her real inventory through the admin — that's her work, not a technical
migration, and it's the longest task in this list. Deploy early so she can
start it in parallel.

## 7. Keeping the site up

Once deployed, the site runs on Netlify's servers 24/7. **No laptop is
involved.** Netlify is self-healing and very reliable — it is not the thing
that will take the shop down.

### The real risk: Supabase pausing

Supabase pauses free projects after **~7 days with no traffic**. If that
happens the website still loads, but products, orders, and the admin all
break, because the data behind them is asleep. For a new shop that has not
been announced yet, a quiet week is entirely plausible.

### Fix: a free uptime monitor (do this at launch)

Sign up at [uptimerobot.com](https://uptimerobot.com) (free tier is plenty)
and add one monitor:

- **URL:** the live site (`https://piecesbyp.com`)
- **Interval:** every 5 minutes
- **Alert email:** Polly's

This does two jobs at once:

1. **Keeps Supabase awake.** Regular traffic means the project never hits the
   inactivity threshold, so it never pauses.
2. **Tells her if the shop goes down**, rather than her finding out from a
   customer who couldn't order.

Add Jack's email as a second alert contact while he's still supporting it.

### If it ever does pause

Open the Supabase dashboard and press **Restore** / **Resume**. Data is not
lost — it comes back exactly as it was, usually within a minute.

### The paid alternative

Supabase Pro ($25/month) removes pausing entirely. Not worth buying up front:
the uptime monitor solves the same problem for free, and once the shop has
real customers the traffic keeps it awake on its own.

## 8. After handover

- Polly runs everything day to day: orders, pieces, photos, prices, stock,
  all site wording, section layout, accent colour, logo.
- She does **not** need a developer for any of that.
- New features or bugs still need Jack — normal software maintenance, and
  separate from running the shop.
- Jack works via **her** logins rather than holding parallel access.
