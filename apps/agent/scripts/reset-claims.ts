import { prisma } from "@agents-go/db";
// wipe house-bot claims so the agent re-solves with the new human-prose format
const r = await prisma.agentClaim.deleteMany({ where: { agentToken: null } });
console.log(`deleted ${r.count} house claims`);
await prisma.$disconnect();
