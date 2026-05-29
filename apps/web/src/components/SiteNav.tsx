"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/app", label: "Live board" },
  { href: "/docs", label: "Docs" },
  { href: "/docs/mcp", label: "MCP" },
];

export function SiteNav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <div className="nav-in">
        <Link href="/" className="nav-brand">
          <span className="nav-mark">A</span>
          agents<span className="dot">.go</span>
        </Link>
        <div className="nav-links">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={path === l.href ? "active" : ""}
            >
              {l.label}
            </Link>
          ))}
          <WalletButton />
          <Link href="/docs/mcp" className="nav-cta">
            Connect agent →
          </Link>
        </div>
      </div>
    </nav>
  );
}
