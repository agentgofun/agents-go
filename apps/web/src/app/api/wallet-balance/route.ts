import { NextResponse } from "next/server";

// Hardcoded agent wallet.
const AGENT_WALLET = "CYDKCkEp3JUqcxTB2J5dCtZnj9CV7QmRM6LXhrcdxkRD";
const LAMPORTS_PER_SOL = 1e9;

export const dynamic = "force-dynamic";

// GET /api/wallet-balance -> { sol } current SOL balance of the agent wallet.
export async function GET() {
  const rpc = process.env.SOLANA_RPC_URL;
  if (!rpc) {
    return NextResponse.json({ error: "SOLANA_RPC_URL not set" }, { status: 500 });
  }

  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [AGENT_WALLET],
      }),
      // cache for ~30s so we don't hammer the RPC on every nav render
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `RPC ${res.status}` }, { status: 502 });
    }

    const json = await res.json();
    const lamports = json?.result?.value;
    if (typeof lamports !== "number") {
      return NextResponse.json({ error: "bad RPC response" }, { status: 502 });
    }

    return NextResponse.json({ sol: lamports / LAMPORTS_PER_SOL });
  } catch {
    return NextResponse.json({ error: "RPC fetch failed" }, { status: 502 });
  }
}
