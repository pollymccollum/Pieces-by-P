"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "../actions-auth";
import { Badge } from "@/components/storefront/visuals";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, undefined);

  return (
    <form action={action} className="ad-login">
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <Badge s={52} />
      </div>
      <div className="ad-login-title">Pieces by P</div>
      <div className="ad-login-sub">Owner sign in</div>

      <label className="pp-field" style={{ marginTop: 18 }}>
        <span className="pp-flabel">Email</span>
        <input className="pp-input" name="email" type="email" autoComplete="username" required autoFocus />
      </label>

      <label className="pp-field" style={{ marginTop: 12 }}>
        <span className="pp-flabel">Password</span>
        <input className="pp-input" name="password" type="password" autoComplete="current-password" required />
      </label>

      {state?.error && <p className="pp-hint">{state.error}</p>}

      <button className="pp-btn sage" style={{ width: "100%", marginTop: 18 }} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="pp-note" style={{ marginTop: 14, textAlign: "center" }}>
        This is the shop owner&apos;s login. Customers never need an account.
      </p>
    </form>
  );
}
