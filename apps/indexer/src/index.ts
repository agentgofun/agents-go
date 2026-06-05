import { prisma } from "@agents-go/db";
import {
  GoClient,
  bountyRewardSol,
  type BountyPhase,
  type GoBounty,
} from "@agents-go/shared";

const POLL_MS = Number(process.env.INDEXER_POLL_MS ?? 30_000);
const ONCE = process.argv.includes("--once");

const client = new GoClient({ base: process.env.GO_API_BASE });

// We mirror every phase so the dashboard can show All / closed / disputed.
const PHASES: BountyPhase[] = ["OPEN", "PENDING_RESOLUTION", "CLOSED", "IN_DISPUTE_PERIOD"];

function toDate(s?: string): Date | undefined {
  return s ? new Date(s) : undefined;
}

async function upsertBounty(b: GoBounty): Promise<void> {
  const vaults = b.rewardLegs.map((l) => l.rewardVaultAddress).filter(Boolean);
  await prisma.bounty.upsert({
    where: { taskId: b.taskId },
    create: {
      taskId: b.taskId,
      creatorAddress: b.creatorAddress,
      title: b.title,
      bodyMarkdown: b.bodyMarkdown,
      criteria: b.criteria as object,
      rewardLegs: b.rewardLegs as object,
      attachments: (b.attachments ?? []) as object,
      rewardTotalUsd: b.rewardTotalUsd ?? null,
      rewardSol: bountyRewardSol(b),
      coinAddress: b.coinAddress ?? null,
      status: b.status,
      submissionCount: b.counts?.submissionCount ?? 0,
      likeCount: b.likeCount ?? 0,
      onChainBountyId: b.onChainBountyId ?? null,
      rewardVaultAddrs: vaults,
      creatorXFollowerCount: b.creatorXFollowerCount ?? null,
      creatorXVerified: b.creatorXVerified ?? null,
      expiresAt: toDate(b.expiresAt),
      publishedAt: toDate(b.publishedAt),
      fundedAt: toDate(b.fundedAt),
      createdAt: new Date(b.createdAt),
    },
    update: {
      title: b.title,
      bodyMarkdown: b.bodyMarkdown,
      criteria: b.criteria as object,
      rewardLegs: b.rewardLegs as object,
      attachments: (b.attachments ?? []) as object,
      rewardTotalUsd: b.rewardTotalUsd ?? null,
      rewardSol: bountyRewardSol(b),
      status: b.status,
      submissionCount: b.counts?.submissionCount ?? 0,
      likeCount: b.likeCount ?? 0,
      rewardVaultAddrs: vaults,
      expiresAt: toDate(b.expiresAt),
    },
  });
}

async function tick(): Promise<void> {
  const started = Date.now();
  let total = 0;
  for (const phase of PHASES) {
    try {
      // GO caps a page at 100 and ignores offset — walk the cursor to get all.
      const items = await client.allTasks({ phase, pageSize: 100 });
      for (const b of items) await upsertBounty(b);
      total += items.length;
    } catch (err) {
      console.error(`[indexer] phase ${phase} failed:`, (err as Error).message);
    }
  }
  console.log(
    `[indexer] synced ${total} bounties in ${Date.now() - started}ms @ ${new Date().toISOString()}`,
  );
}

async function main(): Promise<void> {
  console.log(`[indexer] starting. once=${ONCE} poll=${POLL_MS}ms`);
  await tick();
  if (ONCE) {
    await prisma.$disconnect();
    return;
  }
  setInterval(() => {
    tick().catch((e) => console.error("[indexer] tick error:", e));
  }, POLL_MS);
}

main().catch((e) => {
  console.error("[indexer] fatal:", e);
  process.exit(1);
});
