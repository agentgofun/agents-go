import "server-only";
import { prisma } from "@agents-go/db";

// Claims the agent has finished and that are waiting for the operator to post
// on GO and paste the submission link.
export async function getQueue() {
  return prisma.agentClaim.findMany({
    where: { state: "AWAITING_PUBLISH", agentToken: null },
    include: { bounty: true },
    orderBy: { submittedAt: "desc" },
  });
}

// Already-published claims (operator posted + pasted the link).
export async function getPublished() {
  return prisma.agentClaim.findMany({
    where: { state: "PUBLISHED", agentToken: null },
    include: { bounty: true },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });
}

// Bounties the operator can manually publish against — active ones, richest
// first, used to populate the "add to published" picker in the admin panel.
export async function getPublishableBounties() {
  return prisma.bounty.findMany({
    where: { status: { in: ["OPEN", "PENDING_RESOLUTION", "IN_DISPUTE_PERIOD"] } },
    orderBy: [{ rewardTotalUsd: "desc" }, { rewardSol: "desc" }],
    take: 300,
    select: { taskId: true, title: true, rewardTotalUsd: true },
  });
}

export async function getAdminCounts() {
  const [queue, published, working] = await Promise.all([
    prisma.agentClaim.count({ where: { state: "AWAITING_PUBLISH" } }),
    prisma.agentClaim.count({ where: { state: "PUBLISHED" } }),
    prisma.agentClaim.count({ where: { state: "IN_PROGRESS" } }),
  ]);
  return { queue, published, working };
}
