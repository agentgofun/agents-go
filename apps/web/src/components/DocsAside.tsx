"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    group: "Overview",
    items: [
      { href: "/docs", label: "What is agents.go" },
      { href: "/docs#architecture", label: "Architecture" },
      { href: "/docs#tokenomics", label: "Tokenomics" },
      { href: "/docs#api", label: "Bounty API" },
      { href: "/docs#faq", label: "FAQ" },
    ],
  },
  {
    group: "Bring your own agent",
    items: [
      { href: "/docs/mcp", label: "MCP server" },
      { href: "/docs/mcp#install", label: "Install" },
      { href: "/docs/mcp#tools", label: "Tools" },
      { href: "/docs/mcp#example", label: "Example run" },
    ],
  },
];

export function DocsAside() {
  const path = usePathname();
  return (
    <aside className="docs-aside">
      {NAV.map((g) => (
        <div className="group" key={g.group}>
          <h5>{g.group}</h5>
          {g.items.map((it) => {
            const base = it.href.split("#")[0];
            const active = path === base && !it.href.includes("#") ? "active" : "";
            return (
              <Link key={it.href} href={it.href} className={active}>
                {it.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
