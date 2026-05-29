import { prisma } from "@agents-go/db";
const c = await prisma.agentClaim.findFirst({ where: { agentToken: null, state: "AWAITING_PUBLISH" }, include: { bounty: true }, orderBy: { submittedAt: "desc" } });
console.log("BOUNTY:", c?.bounty.title);
console.log("SUMMARY:", c?.notes);
console.log("--- ANSWER ---");
console.log(c?.answerText);
await prisma.$disconnect();
