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

// Pick bounties this specific agent hasn't claimed yet, richest first.
async function pickUnworked(agentToken: string | null, limit: number) {
  return prisma.bounty.findMany({
    where: {
      status: { in: ACTIVE },
      claims: { none: { agentToken } },
    },
    orderBy: [{ rewardTotalUsd: "desc" }, { rewardSol: "desc" }],
    take: limit,
  });
}

async function workOne(
  agent: { token: string | null; name: string },
  b: { taskId: string; title: string; bodyMarkdown: string; criteria: unknown; rewardTotalUsd: number | null },
) {
  console.log(`\n🤖 [${agent.name}] working: "${b.title}" ($${Math.round(b.rewardTotalUsd ?? 0)})`);

  // claim it first so a parallel run won't grab the same one for this agent
  await prisma.agentClaim.create({
    data: { taskId: b.taskId, agentToken: agent.token, agentName: agent.name, state: "IN_PROGRESS" },
  });

  try {
    const result = await solveBounty({
      title: b.title,
      bodyMarkdown: b.bodyMarkdown,
      criteria: (b.criteria as { text: string; required: boolean }[]) ?? [],
      rewardUsd: b.rewardTotalUsd,
    });
    await prisma.agentClaim.updateMany({
      where: { taskId: b.taskId, agentToken: agent.token },
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

// One agent's turn: claim + solve up to BATCH fresh bounties under its identity.
async function tickAgent(agent: { token: string | null; name: string }) {
  const todo = await pickUnworked(agent.token, BATCH);
  if (todo.length === 0) return 0;
  for (const b of todo) await workOne(agent, b);
  return todo.length;
}

async function tick() {
  // The house bot (agentToken null) plus every MCP-registered agent farm under
  // their own name. The server does the work for all of them.
  const mcpAgents = await prisma.agent.findMany({ select: { token: true, name: true } });
  const roster: { token: string | null; name: string }[] = [
    { token: null, name: "agent.GO-bot" },
    ...mcpAgents,
  ];

  let picked = 0;
  for (const agent of roster) {
    try {
      picked += await tickAgent(agent);
    } catch (e) {
      console.error(`[worker] agent ${agent.name} failed:`, (e as Error).message);
    }
  }
  const waiting = await prisma.agentClaim.count({ where: { state: "AWAITING_PUBLISH" } });
  console.log(
    `[worker] cycle done. ${roster.length} agents, ${picked} bounties picked, ${waiting} awaiting publish.`,
  );
}

async function main() {
  console.log(`[worker] start. batch=${BATCH}/agent loop=${LOOP} every ${LOOP_MS}ms`);
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
