// Verifies a Supabase project is ready for the storefront.
// Run with: npm run check:supabase   (reads .env.local)
//
// Checks, in order:
//   1. env vars are present
//   2. schema.sql ran      -> site_settings row exists
//   3. seed.sql ran        -> products are readable
//   4. rls.sql ran         -> orders are NOT readable with the anon key
//
// Exits non-zero on the first failure so it is usable in a pipeline.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ok = (m) => console.log(`  ok    ${m}`);
const warn = (m) => console.log(`  warn  ${m}`);
const fail = (m) => {
  console.error(`  FAIL  ${m}`);
  process.exitCode = 1;
};

console.log("\nChecking Supabase setup...\n");

if (!url || !anonKey) {
  fail("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local");
  console.log("\nFill both in, then run this again.\n");
  process.exit(1);
}
ok(`env vars present (${url})`);

const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

// Reachability probe, before any other check.
//
// Without this, a paused or unreachable project returns 'fetch failed' on
// every query — and several checks below treat *any* error as the expected
// one, so a dead database reported three PASSING checks. A false green is
// worse than no check at all, so stop dead here instead.
{
  const { error } = await supabase.from("site_settings").select("id").limit(1);
  const unreachable =
    error &&
    /fetch failed|ENOTFOUND|ECONNREFUSED|network|timeout|getaddrinfo/i.test(error.message);

  if (unreachable) {
    fail(`cannot reach ${url}`);
    console.log("");
    console.log("  The project is unreachable. Most likely it is PAUSED —");
    console.log("  Supabase pauses free projects after ~7 days with no traffic.");
    console.log("  Open the Supabase dashboard, press Restore/Resume, wait a");
    console.log("  minute, then run this again.");
    console.log("");
    console.log("  (Other causes: wrong NEXT_PUBLIC_SUPABASE_URL, deleted project,");
    console.log("   or no internet connection.)");
    console.log("");
    process.exit(1);
  }
}

// 2. schema.sql
const settings = await supabase.from("site_settings").select("data").eq("id", 1).single();
if (settings.error) {
  fail(`cannot read site_settings — did schema.sql run? (${settings.error.message})`);
} else {
  const d = settings.data.data ?? {};
  ok(`site_settings row found (brand: ${d.brand ?? "unset"})`);
  if (!d.hero || !d.about || !d.contact) {
    warn("hero/about/contact copy not set — the owner writes this in /admin");
    warn("  (dev projects only: supabase/seed.sql loads sample copy)");
  } else {
    ok("hero / about / contact copy present");
  }
}

// 3. seed.sql
const products = await supabase.from("products").select("id, name, active").eq("active", true);
if (products.error) {
  fail(`cannot read products — did schema.sql run? (${products.error.message})`);
} else if (products.data.length === 0) {
  warn("no active products yet — the owner adds pieces in /admin");
  warn("  (dev projects only: supabase/seed.sql loads 12 samples)");
} else {
  ok(`${products.data.length} active products readable`);
}

// 4. rls.sql — orders must be invisible to the public anon key.
const orders = await supabase.from("orders").select("id");
if (orders.error) {
  ok("orders are locked down (RLS active)");
} else if (orders.data.length === 0) {
  // Ambiguous from out here: RLS filtering everything out and a genuinely
  // empty table both return zero rows with no error. Only Postgres knows.
  warn("orders query returned empty — cannot tell if RLS is on or the table is just empty");
  warn("  -> run supabase/verify-rls.sql in the SQL Editor to confirm");
} else {
  fail(`orders are PUBLICLY READABLE (${orders.data.length} rows) — run supabase/rls.sql now`);
}

// 5. layout-settings.sql — section order + accent must exist for the editor.
if (!settings.error && settings.data) {
  const d = settings.data.data ?? {};
  if (!Array.isArray(d.sections) || !d.accent) {
    warn("layout settings missing — run supabase/layout-settings.sql");
  } else {
    ok(`layout settings present (${d.sections.length} sections, accent: ${d.accent})`);
  }
}

// 6. storage.sql — the photo bucket must exist and be publicly readable.
const bucket = await supabase.storage.from("product-photos").list("", { limit: 1 });
if (bucket.error) {
  warn(`photo bucket not reachable — run supabase/storage.sql (${bucket.error.message})`);
} else {
  ok("photo bucket 'product-photos' exists and is readable");
}

// 7. add-contact-fields.sql — customer_instagram must exist.
// Column resolution happens before RLS filtering, so a missing column comes
// back as an error while an existing one returns an empty (RLS-filtered) set.
const igCol = await supabase.from("orders").select("customer_instagram").limit(1);
if (igCol.error && /column .* does not exist|42703/i.test(igCol.error.message)) {
  fail("orders.customer_instagram missing — run supabase/add-contact-fields.sql");
} else {
  ok("customer contact columns present");
}

// 8. add-stock.sql — stock column + the reserve function must both exist.
const stockCol = await supabase.from("products").select("stock").limit(1);
if (stockCol.error && /column .* does not exist|42703/i.test(stockCol.error.message)) {
  fail("products.stock missing — run supabase/add-stock.sql");
} else {
  // Calling with an empty list is a no-op, so this only proves the function
  // exists and is callable by the public role.
  const rpc = await supabase.rpc("reserve_stock", { items: [] });
  if (rpc.error && /could not find|does not exist|42883/i.test(rpc.error.message)) {
    fail("reserve_stock() missing — run supabase/add-stock.sql");
  } else {
    ok("stock column + reserve_stock() present");
  }
}

// 9. email (optional — the site works fine without it)
if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM) {
  warn("email not configured — no confirmation/shipped emails will send");
  warn("  -> set BREVO_API_KEY and EMAIL_FROM in .env.local (brevo.com)");
} else {
  ok(`emails send from ${process.env.EMAIL_FROM}`);
}

// 9b. Every column the app selects actually exists.
//
// A missing column doesn't look like a missing column at runtime: the query
// errors, the loader falls back to an empty list, and the orders page renders
// "No orders yet" with real orders sitting in the database. That is the whole
// class of bug this section exists to catch — a migration written but never
// run reads as a quiet, healthy-looking shop.
//
// PostgREST reports an unknown column even when RLS would block the read, so
// this works with the public key alone.
{
  const NEEDED = [
    ["products", "charm_text", "add-charm-text.sql"],
    ["product_images", "focal_x", "add-photo-focus.sql"],
    ["product_images", "zoom", "add-photo-focus.sql"],
    ["orders", "archived_at", "add-order-archive.sql"],
    ["orders", "confirmation_email", "add-email-status.sql"],
  ];

  const missing = [];
  for (const [table, column, file] of NEEDED) {
    const { error } = await supabase.from(table).select(column).limit(1);
    if (error && /does not exist|schema cache/i.test(error.message)) {
      missing.push({ table, column, file });
    }
  }

  if (missing.length === 0) {
    ok(`all ${NEEDED.length} app columns present`);
  } else {
    for (const m of missing) {
      fail(`${m.table}.${m.column} missing — run supabase/${m.file}`);
    }
    warn("  -> or paste supabase/setup-new-project.sql, which contains all of them");
  }
}

// 10. Stripe + service role
//
// The webhook is the only thing that marks a card order paid, and its secret
// carries no mode marker of its own — a live secret key paired with a test
// webhook secret looks fine in every env file and fails silently at the worst
// possible moment: the card is charged and no order is ever recorded.
//
// So rather than compare strings, ask Stripe. Listing webhook endpoints with
// the secret key returns the endpoints that exist IN THAT KEY'S MODE, which
// answers the real question: does the mode I'm about to sell in actually have
// a working webhook pointing at this site?
const sk = process.env.STRIPE_SECRET_KEY?.trim();
const whsec = process.env.STRIPE_WEBHOOK_SECRET?.trim();
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

const keyMode = (k) => (k?.includes("_test_") ? "test" : k?.includes("_live_") ? "LIVE" : null);

if (!sk) {
  warn("card payments off — STRIPE_SECRET_KEY not set (Venmo checkout still works)");
} else {
  const skMode = keyMode(sk);
  ok(`Stripe secret key present (${skMode ?? "unrecognised format"} mode)`);

  if (skMode === "LIVE") {
    warn("Stripe is in LIVE mode — real cards will be charged.");
    if (siteUrl && /localhost|127\.0\.0\.1/.test(siteUrl)) {
      fail(`LIVE Stripe keys with NEXT_PUBLIC_SITE_URL=${siteUrl} — customers would be sent to localhost after paying.`);
    }
  }

  if (!whsec) {
    fail("STRIPE_WEBHOOK_SECRET not set — cards would be charged and no order recorded");
    warn("  -> local: stripe listen --forward-to localhost:3000/api/stripe/webhook");
  } else {
    ok("Stripe webhook secret present");
  }

  // Ask Stripe what exists in this key's mode.
  //
  // Two APIs to check: endpoints made in the older dashboard live under
  // /v1/webhook_endpoints, ones made in Workbench under /v2 event
  // destinations. Checking only one would report "no webhook" at a shop that
  // has a perfectly good one, and a check that cries wolf gets ignored
  // exactly when it finally means something.
  const localSite = !siteUrl || /localhost|127\.0\.0\.1/.test(siteUrl);
  try {
    const endpoints = [];
    for (const api of [
      "https://api.stripe.com/v1/webhook_endpoints?limit=100",
      "https://api.stripe.com/v2/core/event_destinations?limit=100",
    ]) {
      const res = await fetch(api, {
        headers: { Authorization: `Bearer ${sk}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const body = await res.json();
      for (const e of body.data ?? []) {
        endpoints.push({
          url: e.url ?? e.webhook_endpoint?.url ?? "(unknown url)",
          enabled: (e.status ?? e.enabled_status ?? "enabled") === "enabled",
          events: e.enabled_events ?? e.events_from?.map?.((x) => x) ?? e.event_types ?? [],
        });
      }
    }

    const enabled = endpoints.filter((e) => e.enabled);

    if (enabled.length === 0) {
      // Locally this is normal — `stripe listen` forwards without registering
      // anything. On a real domain it means paid orders go unrecorded.
      const msg = `no registered webhook endpoint in Stripe ${skMode ?? "this"} mode`;
      if (localSite) {
        warn(`${msg} (fine if you're using: stripe listen --forward-to localhost:3000/api/stripe/webhook)`);
      } else {
        fail(`${msg} — cards would be charged and no order ever recorded`);
        warn("  -> Stripe Dashboard > Developers > Webhooks > Add destination");
        warn("  -> a webhook made in TEST mode does not carry over to LIVE");
      }
    } else {
      const NEEDED = ["checkout.session.completed", "checkout.session.expired"];
      const matching = siteUrl && !localSite ? enabled.filter((e) => e.url.startsWith(siteUrl)) : enabled;

      if (siteUrl && !localSite && matching.length === 0) {
        fail(`Stripe has ${enabled.length} webhook(s) in ${skMode ?? "this"} mode, none pointing at ${siteUrl}`);
        enabled.forEach((e) => warn(`  -> found instead: ${e.url}`));
      } else {
        for (const e of matching) {
          const all = e.events.includes("*");
          const missing = NEEDED.filter((n) => !all && !e.events.includes(n));
          if (missing.length) {
            fail(`webhook ${e.url} is not listening for: ${missing.join(", ")}`);
          } else {
            ok(`webhook ready: ${e.url}`);
          }
        }
      }
    }
  } catch (err) {
    warn(`couldn't reach Stripe to verify the webhook (${err.message})`);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    fail("SUPABASE_SERVICE_ROLE_KEY missing — checkout refuses every order and the webhook can't record payment");
  } else {
    ok("service-role key present (webhook, stock reservation, rate limiting)");
  }
}

// 11. admin login gate
if (!process.env.ADMIN_EMAIL?.trim()) {
  warn("ADMIN_EMAIL not set — nobody can sign in to /admin");
} else {
  ok(`admin gated to ${process.env.ADMIN_EMAIL.trim()}`);
}

console.log(
  process.exitCode === 1
    ? "\nSomething needs fixing above.\n"
    : "\nSupabase looks ready. Start the site with: npm run dev\n"
);
