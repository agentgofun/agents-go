import { prisma } from "@agents-go/db";
const taskId = "d4bb89a8-c8fc-4579-896b-75109efcee9e";
const b = await prisma.bounty.findUnique({ where: { taskId } });
const c = await prisma.agentClaim.findFirst({ where: { taskId }, orderBy: { claimedAt: "desc" } });
console.log("bounty:", b?.title);
console.log("has answer:", !!c?.answerText, "| chars:", c?.answerText?.length ?? 0);
if (c?.answerText) console.log("preview:", c.answerText.slice(0, 200));
await prisma.$disconnect();
