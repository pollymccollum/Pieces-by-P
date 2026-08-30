"use client";

import { useActionState, useState } from "react";
import { requestPasswordReset, signIn, type ForgotState, type LoginState } from "../actions-auth";
import { Badge } from "@/components/storefront/visuals";

export function LoginForm({ notice }: { notice: string | null }) {
  const [forgot, setForgot] = useState(false);

  return (
    <div className="ad-login">
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <Badge s={52} />
      </div>
      <div className="ad-login-title">Pieces by P</div>
      <div className="ad-login-sub">{forgot ? "Reset your password" : "Owner sign in"}</div>

      {notice && (
        <p className="pp-hint" style={{ marginTop: 14 }}>
          {notice}
        </p>
      )}

      {forgot ? (
        <ForgotFields onBack={() => setForgot(false)} />
      ) : (
        <SignInFields onForgot={() => setForgot(true)} />
      )}
    </div>
  );
}

function SignInFields({ onForgot }: { onForgot: () => void }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, undefined);

  return (
    <form action={action}>
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

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <button type="button" className="ad-linkbtn" onClick={onForgot}>
          Forgot your password?
        </button>
      </div>

      <p className="pp-note" style={{ marginTop: 10, textAlign: "center" }}>
        This is the shop owner&apos;s login. Customers never need an account.
      </p>
    </form>
  );
}

function ForgotFields({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState<ForgotState, FormData>(
    requestPasswordReset,
    undefined
  );

  // Deliberately the same message whether or not that address is the owner's.
  if (state && "sent" in state) {
    return (
      <>
        <p className="pp-note" style={{ marginTop: 18, lineHeight: 1.7 }}>
          If that&apos;s the owner&apos;s address, a reset link is on its way. It lasts one hour,
          and it has to be opened in this same browser.
        </p>
        <p className="pp-note" style={{ marginTop: 10 }}>
          Nothing after a few minutes? Check the spam folder.
        </p>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button type="button" className="ad-linkbtn" onClick={onBack}>
            Back to sign in
          </button>
        </div>
      </>
    );
  }

  return (
    <form action={action}>
      <p className="pp-note" style={{ marginTop: 16, lineHeight: 1.7 }}>
        Enter the email you sign in with and we&apos;ll send a link to set a new password.
      </p>

      <label className="pp-field" style={{ marginTop: 14 }}>
        <span className="pp-flabel">Email</span>
        <input className="pp-input" name="email" type="email" autoComplete="username" required autoFocus />
      </label>

      {state && "error" in state && <p className="pp-hint">{state.error}</p>}

      <button className="pp-btn sage" style={{ width: "100%", marginTop: 18 }} disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <button type="button" className="ad-linkbtn" onClick={onBack}>
          Back to sign in
        </button>
      </div>
    </form>
  );
}
