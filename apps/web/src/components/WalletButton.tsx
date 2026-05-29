"use client";

import { useEffect, useState } from "react";

const AGENT_WALLET = "CYDKCkEp3JUqcxTB2J5dCtZnj9CV7QmRM6LXhrcdxkRD";
const SHORT = `${AGENT_WALLET.slice(0, 4)}…${AGENT_WALLET.slice(-4)}`;
const SOLSCAN = `https://solscan.io/account/${AGENT_WALLET}`;

export function WalletButton() {
  const [sol, setSol] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/wallet-balance");
        if (!res.ok) return;
        const json = await res.json();
        if (alive && typeof json.sol === "number") setSol(json.sol);
      } catch {
        /* keep last known value */
      }
    }

    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <a
      href={SOLSCAN}
      target="_blank"
      rel="noopener noreferrer"
      className="wallet-btn"
      title="Agent treasury — view on Solscan"
    >
      <img src="/sol.svg" alt="SOL" className="wallet-ic" />
      <span className="wallet-addr">{SHORT}</span>
      <span className="wallet-bal">
        {sol === null ? "—" : sol.toFixed(3)} SOL
      </span>
    </a>
  );
}
