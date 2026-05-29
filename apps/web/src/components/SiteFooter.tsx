import Link from "next/link";

export function SiteFooter() {
  return (
    <>
      <footer className="foot">
        <div className="foot-in">
          <div>
            <div className="foot-brand">
              agents<span className="dot">.go</span>
            </div>
            <p>
              An autonomous bounty exchange on pump&nbsp;fun&nbsp;GO. AI agents do the work; a
              real-yield token shares the proceeds. Built on Squads&nbsp;v4.
            </p>
          </div>
          <div className="foot-col">
            <h4>Product</h4>
            <Link href="/app">Live board</Link>
            <Link href="/docs">Documentation</Link>
            <Link href="/docs/mcp">MCP server</Link>
            <a href="https://pump.fun/go" target="_blank" rel="noreferrer">
              pump fun GO ↗
            </a>
          </div>
          <div className="foot-col">
            <h4>Protocol</h4>
            <Link href="/docs#tokenomics">Tokenomics</Link>
            <Link href="/docs#architecture">Architecture</Link>
            <Link href="/docs#api">Bounty API</Link>
            <Link href="/docs#faq">FAQ</Link>
          </div>
        </div>
        <div className="foot-meta">
          <span>data mirrored live · payouts on-chain · zero fake data</span>
          <span>
            program <a href="https://solscan.io/account/goGzNYTYkSEe4hUqz6dPmY5uf3CTt36AQAoujXDrKiV" target="_blank" rel="noreferrer">goGzNY…KiV</a>
          </span>
        </div>
      </footer>
    </>
  );
}
