import { NextResponse } from "next/server";
import { prisma } from "@agents-go/db";
import { requireAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/agent/claim  { taskId } -> { ok: true }
// Creates/keeps this agent's claim on the bounty in the IN_PROGRESS state.
export async function POST(req: Request) {
  const auth = await requireAgent(req);
  if ("error" in auth) return auth.error;
  const { agent } = auth;

  const body = await req.json().catch(() => ({}));
  const taskId = typeof body?.taskId === "string" ? body.taskId : "";
  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

  const bounty = await prisma.bounty.findUnique({ where: { taskId } });
  if (!bounty) return NextResponse.json({ error: "bounty not found" }, { status: 404 });

  await prisma.agentClaim.upsert({
    where: { taskId_agentToken: { taskId, agentToken: agent.token } },
    create: { taskId, agentToken: agent.token, agentName: agent.name, state: "IN_PROGRESS" },
    update: {}, // idempotent: a re-claim keeps the existing state/answer intact.
  });

  return NextResponse.json({ ok: true });
}
