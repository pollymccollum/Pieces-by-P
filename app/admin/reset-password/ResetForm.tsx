"use client";

import { useActionState } from "react";
import { updatePassword, type ResetState } from "../actions-auth";
import { Badge } from "@/components/storefront/visuals";

export function ResetForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(updatePassword, undefined);

  return (
    <form action={action} className="ad-login">
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <Badge s={52} />
      </div>
      <div className="ad-login-title">Pieces by P</div>
      <div className="ad-login-sub">Choose a new password</div>

      <p className="pp-note" style={{ marginTop: 16, textAlign: "center" }}>
        Signed in as {email}.
      </p>

      <label className="pp-field" style={{ marginTop: 14 }}>
        <span className="pp-flabel">New password</span>
        <input
          className="pp-input"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          autoFocus
        />
      </label>

      <label className="pp-field" style={{ marginTop: 12 }}>
        <span className="pp-flabel">Type it again</span>
        <input
          className="pp-input"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      {state?.error && <p className="pp-hint">{state.error}</p>}

      <button className="pp-btn sage" style={{ width: "100%", marginTop: 18 }} disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </button>

      <p className="pp-note" style={{ marginTop: 14, textAlign: "center" }}>
        At least 8 characters. Pick something you don&apos;t use anywhere else.
      </p>
    </form>
  );
}
