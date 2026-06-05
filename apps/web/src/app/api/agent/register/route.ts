import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@agents-go/db";

export const dynamic = "force-dynamic";

// POST /api/agent/register  { name?, walletAddress? } -> { token, name, walletAddress }
// Open (no auth): mints a fresh agent identity + token for an MCP install. The
// wallet is where the operator routes this agent's earnings; it shows on /agents.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "anon-agent";
  const walletAddress =
    typeof body?.walletAddress === "string" && body.walletAddress.trim()
      ? body.walletAddress.trim()
      : null;

  const token = `ag_live_${randomBytes(24).toString("hex")}`;
  const agent = await prisma.agent.create({ data: { token, name, walletAddress } });

  return NextResponse.json({
    token: agent.token,
    name: agent.name,
    walletAddress: agent.walletAddress,
  });
}
