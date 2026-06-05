import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_COOKIE_VALUE } from "@/lib/auth";
import LogoutButton from "./_components/LogoutButton";
import "./admin.css";

export const metadata: Metadata = {
  title: "agent.GO · operator",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === ADMIN_COOKIE_VALUE;

  return (
    <div className="admin-shell">
      {authed && (
        <header className="admin-bar">
          <div className="admin-bar-brand">
            agent<span>.GO</span> / operator
          </div>
          <nav className="admin-nav">
            <Link href="/admin/queue">queue</Link>
            <Link href="/admin/published">published</Link>
            <Link href="/" target="_blank">
              site ↗
            </Link>
          </nav>
          <LogoutButton />
        </header>
      )}
      <main className="admin-main">{children}</main>
    </div>
  );
}
