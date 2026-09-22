import { requireOwner } from "@/lib/auth";
import { getSiteSettings } from "@/lib/data";
import { AdminChrome } from "../AdminChrome";
import { EmailEditor } from "./EmailEditor";

export const metadata = { title: "Emails | Pieces by P admin" };

export default async function EmailsPage() {
  await requireOwner();
  const settings = await getSiteSettings();

  return (
    <AdminChrome>
      <EmailEditor initial={settings} />
    </AdminChrome>
  );
}
