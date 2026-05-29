import "server-only";
import { prisma } from "@agents-go/db";

// "Active/open" bounties on GO surface as PENDING_RESOLUTION in their API.
const ACTIVE = ["PENDING_RESOLUTION", "IN_DISPUTE_PERIOD"];

export async function getStats() {
  const [active, working, published, totalPaidAgg] = await Promise.all([
    prisma.bounty.count({ where: { status: { in: ACTIVE } } }),
    prisma.agentClaim.count({ where: { state: { in: ["IN_PROGRESS", "AWAITING_PUBLISH"] } } }),
    prisma.agentClaim.count({ where: { state: { in: ["PUBLISHED", "WON"] } } }),
    prisma.payout.aggregate({ _sum: { amountSol: true } }),
  ]);
  return {
    active,
    claimed: working,
    won: published,
    totalPaidSol: totalPaidAgg._sum.amountSol ?? 0,
  };
}

// Real numbers for the landing hero + stat bar. Everything here comes from
// the indexed bounties / claims / payouts — no invented figures.
export async function getLandingStats() {
  const [active, rewardAgg, subAgg, submitted, paidAgg] = await Promise.all([
    prisma.bounty.count({ where: { status: { in: ACTIVE } } }),
    prisma.bounty.aggregate({
      where: { status: { in: ACTIVE } },
      _sum: { rewardTotalUsd: true },
    }),
    prisma.bounty.aggregate({
      where: { status: { in: ACTIVE } },
      _sum: { submissionCount: true },
    }),
    prisma.agentClaim.count({ where: { state: { in: ["SUBMITTED", "WON"] } } }),
    prisma.payout.aggregate({ _sum: { amountSol: true } }),
  ]);
  return {
    activeBounties: active,
    rewardPoolUsd: rewardAgg._sum.rewardTotalUsd ?? 0,
    openSubmissions: subAgg._sum.submissionCount ?? 0,
    agentSubmissions: submitted,
    totalPaidSol: paidAgg._sum.amountSol ?? 0,
  };
}

// Column 1: all live bounties NOT yet claimed by our agent, richest first.
export async function getAllBounties(limit = 40) {
  return prisma.bounty.findMany({
    where: { status: { in: ACTIVE }, claims: { none: {} } },
    orderBy: [{ rewardTotalUsd: "desc" }, { rewardSol: "desc" }],
    take: limit,
  });
}

// Column 2: bounties the agent picked itself and is working / has an answer
// awaiting the operator to publish.
export async function getInProgress() {
  return prisma.agentClaim.findMany({
    where: { state: { in: ["IN_PROGRESS", "AWAITING_PUBLISH"] } },
    include: { bounty: true },
    orderBy: { claimedAt: "desc" },
  });
}

// Column 3: published claims — the operator posted the agent's answer on GO and
// pasted the submission link (the proof), plus any won/paid ones.
export async function getDone() {
  return prisma.agentClaim.findMany({
    where: { state: { in: ["PUBLISHED", "WON", "LOST"] } },
    include: { bounty: true, payout: true },
    orderBy: [{ publishedAt: "desc" }, { resolvedAt: "desc" }],
    take: 40,
  });
}

export type BoardRow = {
  taskId: string;
  title: string;
  rewardUsd: number | null;
  rewardSol: number;
  // "OPEN" if no agent claimed it yet, else the claim's lifecycle state.
  state: "OPEN" | "IN_PROGRESS" | "AWAITING_PUBLISH" | "PUBLISHED" | "SUBMITTED" | "WON" | "LOST";
};

// Compact live board for the landing first screen: the richest live bounties
// with whatever the agent is currently doing on them. All real, from the DB.
export async function getBoardRows(limit = 8): Promise<BoardRow[]> {
  const bounties = await prisma.bounty.findMany({
    where: { status: { in: ACTIVE } },
    orderBy: [{ rewardTotalUsd: "desc" }, { rewardSol: "desc" }],
    take: limit,
    // The landing board reflects the house bot's progress, so look at its claim only.
    include: { claims: { where: { agentToken: null }, select: { state: true }, take: 1 } },
  });
  return bounties.map((b) => ({
    taskId: b.taskId,
    title: b.title,
    rewardUsd: b.rewardTotalUsd,
    rewardSol: b.rewardSol,
    state: b.claims[0]?.state ?? "OPEN",
  }));
}
