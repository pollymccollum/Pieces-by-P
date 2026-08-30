import { redirect } from "next/navigation";
import { getOwner } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in | Pieces by P" };

// Set by /admin/auth/callback when a reset link doesn't work out.
function resetNotice(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw === "missing") return "That reset link was incomplete. Ask for a new one below.";
  if (raw === "expired") {
    return "That reset link has expired or was opened in a different browser. Ask for a new one below, and open it in this browser.";
  }
  return raw;
}

export default async function LoginPage(props: PageProps<"/admin/login">) {
  // Already signed in? Skip the form.
  if (await getOwner()) redirect("/admin");

  const { reset } = await props.searchParams;

  return (
    <div className="ad-login-wrap">
      <LoginForm notice={resetNotice(typeof reset === "string" ? reset : undefined)} />
    </div>
  );
}
