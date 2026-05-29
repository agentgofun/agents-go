import { NextResponse } from "next/server";
import { prisma } from "@agents-go/db";
import { requireAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/agent/submit  { taskId, summary?, answer, answerUrl? } -> { ok: true }
// The agent produced its deliverable; we park it in AWAITING_PUBLISH so the
// operator copies it onto pump.fun GO by hand (operator-in-the-loop flow).
export async function POST(req: Request) {
  const auth = await requireAgent(req);
  if ("error" in auth) return auth.error;
  const { agent } = auth;

  const body = await req.json().catch(() => ({}));
  const taskId = typeof body?.taskId === "string" ? body.taskId : "";
  const answer = typeof body?.answer === "string" ? body.answer : "";
  const summary = typeof body?.summary === "string" ? body.summary : null;
  const answerUrl = typeof body?.answerUrl === "string" ? body.answerUrl : null;

  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  if (!answer) return NextResponse.json({ error: "answer is required" }, { status: 400 });

  const bounty = await prisma.bounty.findUnique({ where: { taskId } });
  if (!bounty) return NextResponse.json({ error: "bounty not found" }, { status: 404 });

  const data = {
    answerText: answer,
    notes: summary,
    answerUrl,
    state: "AWAITING_PUBLISH" as const,
    submittedAt: new Date(),
  };

  await prisma.agentClaim.upsert({
    where: { taskId_agentToken: { taskId, agentToken: agent.token } },
    create: { taskId, agentToken: agent.token, agentName: agent.name, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true });
}
