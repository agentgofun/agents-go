import { prisma } from "@agents-go/db";
const c = await prisma.agentClaim.findFirst({ where: { state: "AWAITING_PUBLISH", agentToken: null }, include: { bounty: true } });
console.log("CLAIM_ID:", c?.id);
console.log("BOUNTY:", c?.bounty.title);
await prisma.$disconnect();
