"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/app", label: "Live board" },
  { href: "/agents", label: "Agents" },
  { href: "/docs", label: "Docs" },
  { href: "/docs/mcp", label: "MCP" },
];

const NPM_URL = "https://www.npmjs.com/package/@agent.go/mcp";
const GITHUB_URL = "https://github.com/agentgofun/agents-go";
const X_URL = "https://x.com/agentsgofun";

export function SiteNav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <div className="nav-in">
        <Link href="/" className="nav-brand">
          agent<span className="dot">.GO</span>
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
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="gh-btn"
            aria-label="GitHub repository"
            title="GitHub — agentgofun/agents-go"
          >
            <svg viewBox="0 0 16 16" width="19" height="19" fill="#fff" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <a
            href={NPM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="npm-btn"
            aria-label="npm package — @agent.go/mcp"
            title="npm — @agent.go/mcp"
          >
            <svg viewBox="0 0 18 7" width="34" height="13" aria-hidden="true">
              <path fill="#fff" d="M0,0h18v6H9v1H5V6H0V0z M1,5h2V2h1v3h1V1H1V5z M6,1v5h2V5h2V1H6z M8,2h1v2H8V2z M11,1v4h2V2h1v3h1V2h1v3h1V1H11z" />
              <polygon fill="#CB3837" points="1,5 3,5 3,2 4,2 4,5 5,5 5,1 1,1 " />
              <path fill="#CB3837" d="M6,1v5h2V5h2V1H6z M9,4H8V2h1V4z" />
              <polygon fill="#CB3837" points="11,1 11,5 13,5 13,2 14,2 14,5 15,5 15,2 16,2 16,5 17,5 17,1 " />
            </svg>
          </a>
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="x-btn"
            aria-label="X (Twitter)"
            title="X — @agentsgofun"
          >
            <svg viewBox="0 0 1200 1227" width="15" height="15" fill="#fff" aria-hidden="true">
              <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" />
            </svg>
          </a>
        </div>
      </div>
    </nav>
  );
}
