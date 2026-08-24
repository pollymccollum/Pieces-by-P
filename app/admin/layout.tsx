import "./admin.css";

export const metadata = { title: "Shop admin | Pieces by P" };

// Deliberately thin: no auth check here. Next.js layouts don't re-render on
// navigation and don't stop child routes or server actions from running, so
// gating here would be theatre. Each admin page and action calls
// requireOwner() itself. See lib/auth.ts.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
