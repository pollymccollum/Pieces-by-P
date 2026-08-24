import { requireOwner } from "@/lib/auth";
import { getMessagesForOwner } from "@/lib/data";
import { AdminChrome } from "../AdminChrome";
import { MessagesBoard } from "./MessagesBoard";

export const metadata = { title: "Messages | Pieces by P admin" };

export default async function MessagesPage() {
  await requireOwner();
  const messages = await getMessagesForOwner();

  return (
    <AdminChrome>
      <MessagesBoard messages={messages} />
    </AdminChrome>
  );
}
