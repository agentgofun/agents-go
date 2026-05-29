import { prisma } from "@agents-go/db";
const total = await prisma.bounty.count();
const byStatus = await prisma.bounty.groupBy({ by: ['status'], _count: true });
const top = await prisma.bounty.findMany({ orderBy: { rewardTotalUsd: 'desc' }, take: 5, select: { title: true, rewardTotalUsd: true, rewardSol: true, status: true, submissionCount: true } });
console.log("TOTAL bounties in Neon:", total);
console.log("By status:", JSON.stringify(byStatus.map(s=>({status:s.status,count:s._count}))));
console.log("\nTOP 5 by reward USD:");
for (const b of top) console.log(`  $${(b.rewardTotalUsd??0).toFixed(0).padStart(6)} | ${b.rewardSol.toFixed(2)} SOL | ${b.status.padEnd(20)} | subs:${b.submissionCount} | ${b.title.slice(0,50)}`);
await prisma.$disconnect();
