import { requireOwner } from "@/lib/auth";
import { ResetForm } from "./ResetForm";

export const metadata = { title: "Choose a new password | Pieces by P" };

export default async function ResetPasswordPage() {
  // The recovery link already signed her in; this confirms the session is
  // real and belongs to the owner account before letting her set a password.
  const owner = await requireOwner();

  return (
    <div className="ad-login-wrap">
      <ResetForm email={owner.email} />
    </div>
  );
}
