import { redirect } from "next/navigation";
import { getOwner } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in | Pieces by P" };

export default async function LoginPage() {
  // Already signed in? Skip the form.
  if (await getOwner()) redirect("/admin");

  return (
    <div className="ad-login-wrap">
      <LoginForm />
    </div>
  );
}
