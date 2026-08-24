import { requireOwner } from "@/lib/auth";
import { getSiteSettings } from "@/lib/data";
import { AdminChrome } from "../AdminChrome";
import { ContentEditor } from "./ContentEditor";

export const metadata = { title: "Site content | Pieces by P admin" };

export default async function ContentPage() {
  await requireOwner();
  const settings = await getSiteSettings();

  return (
    <AdminChrome>
      <ContentEditor initial={settings} />
    </AdminChrome>
  );
}
