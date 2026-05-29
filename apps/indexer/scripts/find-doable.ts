import { prisma } from "@agents-go/db";
const ACTIVE = ["PENDING_RESOLUTION", "IN_DISPUTE_PERIOD"];
const all = await prisma.bounty.findMany({ where: { status: { in: ACTIVE } }, orderBy: { rewardTotalUsd: "desc" } });
// crude heuristic: doable by an LLM if it asks for text/content/writing/thread/code/meme/analysis
// and does NOT require physical/irl/video/interview actions
const physical = /\b(marathon|run |running|interview|march|irl|in person|fly |travel|meet |video|film|record yourself|tattoo|billboard|mcdonald|street|protest|knock)\b/i;
const doable = /\b(write|thread|tweet|post|article|essay|meme|design|logo|code|script|analy|research|list|name|slogan|caption|story|poem|guide|review|translat|summar)\b/i;
console.log("=== Candidates Claude could plausibly do (text/content) ===\n");
let n = 0;
for (const b of all) {
  const text = (b.title + " " + b.bodyMarkdown).toLowerCase();
  if (physical.test(text)) continue;
  if (!doable.test(text)) continue;
  const crit = (b.criteria as any[]).map(c => c.text);
  console.log(`[$${Math.round(b.rewardTotalUsd??0)}] ${b.title}`);
  console.log(`  task: ${b.bodyMarkdown.replace(/\s+/g,' ').slice(0,160)}`);
  console.log(`  criteria: ${crit.map(c=>c.slice(0,60)).join(" | ")}`);
  console.log(`  taskId: ${b.taskId}\n`);
  if (++n >= 8) break;
}
console.log(`(${n} shown)`);
await prisma.$disconnect();
