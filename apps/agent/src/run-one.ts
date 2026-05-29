import { prisma } from "@agents-go/db";
import { solveBounty } from "./solve.js";

// Usage:
//   pnpm run-one                 -> picks the oldest IN_PROGRESS claim
//   pnpm run-one <taskId>        -> claims (if needed) and solves that specific bounty
async function main() {
  const argTaskId = process.argv[2];

  let claim;
  if (argTaskId) {
    // ensure a claim exists for this bounty (house bot ⇒ agentToken: null;
    // Prisma can't upsert on a null compound-unique component, so find-or-create)
    const bounty = await prisma.bounty.findUnique({ where: { taskId: argTaskId } });
    if (!bounty) throw new Error(`bounty ${argTaskId} not found in DB (run the indexer)`);
    claim =
      (await prisma.agentClaim.findFirst({
        where: { taskId: argTaskId, agentToken: null },
        include: { bounty: true },
      })) ??
      (await prisma.agentClaim.create({
        data: { taskId: argTaskId, agentToken: null, state: "IN_PROGRESS" },
        include: { bounty: true },
      }));
  } else {
    claim = await prisma.agentClaim.findFirst({
      where: { state: "IN_PROGRESS" },
      orderBy: { claimedAt: "asc" },
      include: { bounty: true },
    });
    if (!claim) throw new Error("no IN_PROGRESS claim. Claim a bounty on the dashboard first, or pass a taskId.");
  }

  const b = claim.bounty;
  console.log(`\n🤖 agent reading bounty:\n   "${b.title}" ($${Math.round(b.rewardTotalUsd ?? 0)})\n`);

  const result = await solveBounty({
    title: b.title,
    bodyMarkdown: b.bodyMarkdown,
    criteria: (b.criteria as { text: string; required: boolean }[]) ?? [],
    rewardUsd: b.rewardTotalUsd,
  });

  console.log(`   summary: ${result.summary}`);
  console.log(`   answer:  ${result.answer.length} chars\n`);
  console.log("──────── DELIVERABLE PREVIEW ────────");
  console.log(result.answer.slice(0, 800) + (result.answer.length > 800 ? "\n…" : ""));
  console.log("─────────────────────────────────────\n");

  // Persist: the real Claude deliverable. State AWAITING_PUBLISH means the agent
  // is done and the operator now copies it to GO by hand and pastes the link.
  await prisma.agentClaim.updateMany({
    where: { taskId: b.taskId, agentToken: null },
    data: {
      answerText: result.answer,
      notes: result.summary,
      state: "AWAITING_PUBLISH",
      submittedAt: new Date(),
    },
  });

  console.log(`✅ saved & marked AWAITING_PUBLISH — ready for you to post on GO.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("agent error:", e);
  process.exit(1);
});
