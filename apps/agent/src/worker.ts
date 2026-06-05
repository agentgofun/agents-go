import { prisma } from "@agents-go/db";
import { solveBounty } from "./solve.js";

// Autonomous worker: the agent picks open bounties it hasn't worked yet,
// solves each one, and marks it AWAITING_PUBLISH. The operator then copies the
// answer to pump.fun GO by hand and pastes the submission link in the admin panel.
//
//   pnpm worker            # process up to BATCH bounties once, then exit
//   pnpm worker --loop     # keep going every LOOP_MS
//
// Selection: richest open bounties first (best reward-per-effort).

// One bounty per cycle, one cycle every 4 minutes — a single steady agent,
// not a burst that floods the board. Overridable via env.
const BATCH = Number(process.env.AGENT_BATCH ?? 1);
const LOOP_MS = Number(process.env.AGENT_LOOP_MS ?? 240_000);
const ACTIVE = ["OPEN", "PENDING_RESOLUTION", "IN_DISPUTE_PERIOD"]; // GO live phases (now OPEN)
const LOOP = process.argv.includes("--loop");

async function pickUnworked(limit: number) {
  // open bounties with no house claim yet (agentToken: null), richest first
  return prisma.bounty.findMany({
    where: {
      status: { in: ACTIVE },
      claims: { none: { agentToken: null } },
    },
    orderBy: [{ rewardTotalUsd: "desc" }, { rewardSol: "desc" }],
    take: limit,
  });
}

async function workOne(b: { taskId: string; title: string; bodyMarkdown: string; criteria: unknown; rewardTotalUsd: number | null }) {
  console.log(`\n🤖 working: "${b.title}" ($${Math.round(b.rewardTotalUsd ?? 0)})`);

  // claim it first so a parallel run won't grab the same one
  await prisma.agentClaim.create({
    data: { taskId: b.taskId, agentToken: null, state: "IN_PROGRESS" },
  });

  try {
    const result = await solveBounty({
      title: b.title,
      bodyMarkdown: b.bodyMarkdown,
      criteria: (b.criteria as { text: string; required: boolean }[]) ?? [],
      rewardUsd: b.rewardTotalUsd,
    });
    await prisma.agentClaim.updateMany({
      where: { taskId: b.taskId, agentToken: null },
      data: {
        answerText: result.answer,
        notes: result.summary,
        state: "AWAITING_PUBLISH",
        submittedAt: new Date(),
      },
    });
    console.log(`   ✅ ${result.answer.length} chars → AWAITING_PUBLISH`);
  } catch (err) {
    // leave the claim IN_PROGRESS so a later run retries it
    console.error(`   ✗ solve failed: ${(err as Error).message}`);
  }
}

async function tick() {
  const todo = await pickUnworked(BATCH);
  if (todo.length === 0) {
    console.log("[worker] no unworked open bounties right now.");
    return;
  }
  console.log(`[worker] picked ${todo.length} bounties`);
  for (const b of todo) await workOne(b);
  const waiting = await prisma.agentClaim.count({ where: { state: "AWAITING_PUBLISH" } });
  console.log(`[worker] done. ${waiting} answers awaiting publish.`);
}

async function main() {
  console.log(`[worker] start. batch=${BATCH} loop=${LOOP}`);
  await tick();
  if (!LOOP) {
    await prisma.$disconnect();
    return;
  }
  setInterval(() => tick().catch((e) => console.error("[worker] tick error:", e)), LOOP_MS);
}

main().catch((e) => {
  console.error("[worker] fatal:", e);
  process.exit(1);
});
