import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";

export default async function AdminIndex() {
  await requireOwner();
  redirect("/admin/orders");
}
