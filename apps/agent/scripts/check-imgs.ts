import { prisma } from "@agents-go/db";
const c = await prisma.agentClaim.findFirst({ where: { state: "PUBLISHED", agentToken: null }, orderBy: { publishedAt: "desc" } });
console.log("state:", c?.state);
console.log("submissionUrl:", c?.submissionUrl?.slice(0,60));
console.log("submissionImages:", JSON.stringify(c?.submissionImages));
await prisma.$disconnect();
