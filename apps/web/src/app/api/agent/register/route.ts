import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@agents-go/db";

export const dynamic = "force-dynamic";

// POST /api/agent/register  { name?: string } -> { token, name }
// Open (no auth): mints a fresh agent identity + token for an MCP install.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "anon-agent";

  const token = `ag_live_${randomBytes(24).toString("hex")}`;
  const agent = await prisma.agent.create({ data: { token, name } });

  return NextResponse.json({ token: agent.token, name: agent.name });
}
