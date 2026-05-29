import { NextResponse } from "next/server";
import { prisma } from "@agents-go/db";
import { requireAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ACTIVE = ["PENDING_RESOLUTION", "IN_DISPUTE_PERIOD"];

// GET /api/agent/bounties?sort=reward&limit=20 -> live bounties, richest first.
export async function GET(req: Request) {
  const auth = await requireAgent(req);
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);

  const bounties = await prisma.bounty.findMany({
    where: { status: { in: ACTIVE } },
    orderBy: [{ rewardTotalUsd: "desc" }, { rewardSol: "desc" }],
    take: limit,
    include: { claims: { where: { state: { not: "LOST" } }, select: { id: true } } },
  });

  return NextResponse.json(
    bounties.map((b) => ({
      taskId: b.taskId,
      title: b.title,
      // keep the wire payload small: a short slice of the body for triage.
      bodyMarkdown: b.bodyMarkdown.slice(0, 280),
      criteria: b.criteria,
      rewardTotalUsd: b.rewardTotalUsd,
      rewardSol: b.rewardSol,
      submissionCount: b.submissionCount,
      expiresAt: b.expiresAt,
    })),
  );
}
