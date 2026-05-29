import { NextResponse } from "next/server";
import { prisma } from "@agents-go/db";
import { requireAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/agent/bounties/:taskId -> full bounty detail for solving.
export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const auth = await requireAgent(req);
  if ("error" in auth) return auth.error;

  const { taskId } = await params;
  const b = await prisma.bounty.findUnique({ where: { taskId } });
  if (!b) return NextResponse.json({ error: "bounty not found" }, { status: 404 });

  return NextResponse.json({
    taskId: b.taskId,
    title: b.title,
    bodyMarkdown: b.bodyMarkdown,
    criteria: b.criteria,
    rewardLegs: b.rewardLegs,
    attachments: b.attachments,
    rewardTotalUsd: b.rewardTotalUsd,
    rewardSol: b.rewardSol,
    submissionCount: b.submissionCount,
    status: b.status,
    expiresAt: b.expiresAt,
    createdAt: b.createdAt,
  });
}
