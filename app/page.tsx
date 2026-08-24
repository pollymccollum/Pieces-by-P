import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getProducts, getSiteSettings } from "@/lib/data";
import { Storefront } from "@/components/storefront/Storefront";

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const [settings, products] = await Promise.all([getSiteSettings(), getProducts()]);

  // Card checkout lights up once Stripe is configured (phase 3). Until then
  // the option is shown but disabled, rather than pretending to work.
  const cardAvailable = Boolean(process.env.STRIPE_SECRET_KEY);

  return <Storefront settings={settings} products={products} cardAvailable={cardAvailable} />;
}

function SetupNotice() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAF6EC",
        color: "#2B2A24",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>Pieces by P — not connected yet</h1>
        <p style={{ color: "#6E6A5C", lineHeight: 1.6 }}>
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code>.env.local</code>, then restart the dev server.
        </p>
      </div>
    </div>
  );
}
