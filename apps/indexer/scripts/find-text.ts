import { prisma } from "@agents-go/db";
const ACTIVE = ["PENDING_RESOLUTION", "IN_DISPUTE_PERIOD"];
const all = await prisma.bounty.findMany({ where: { status: { in: ACTIVE } }, orderBy: { rewardTotalUsd: "desc" } });
const physical = /\b(marathon|run |running|interview|march|irl|in person|fly |travel|video|film|record yourself|tattoo|billboard|mcdonald|street|protest|knock|mural|spray|shave|tiktok|youtube|100k|views|account|verified)\b/i;
const pureText = /\b(write|thread|tweet|name|slogan|caption|story|poem|whitepaper|copy|bio|description|list|brainstorm|idea|concept|lyrics|song|joke|roast|essay|manifesto|tagline|ticker)\b/i;
console.log("=== Pure-text deliverables (no physical proof) ===\n");
let n=0;
for (const b of all) {
  const t=(b.title+" "+b.bodyMarkdown).toLowerCase();
  if(physical.test(t)) continue;
  if(!pureText.test(t)) continue;
  const crit=(b.criteria as any[]).map(c=>c.text);
  // skip ones demanding PDF or "no AI"
  const noai = crit.some(c=>/no ai|not ai|original work/i.test(c));
  console.log(`[$${Math.round(b.rewardTotalUsd??0)}] ${b.title}${noai?'  ⚠️no-AI':''}`);
  console.log(`  ${b.bodyMarkdown.replace(/\s+/g,' ').slice(0,140)}`);
  console.log(`  criteria: ${crit.map(c=>c.slice(0,55)).join(' | ')}`);
  console.log(`  id: ${b.taskId}\n`);
  if(++n>=10) break;
}
await prisma.$disconnect();
