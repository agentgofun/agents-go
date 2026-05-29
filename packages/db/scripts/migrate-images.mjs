import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  await p.$executeRawUnsafe(`ALTER TABLE "AgentClaim" ADD COLUMN IF NOT EXISTS "submissionImages" TEXT[] DEFAULT ARRAY[]::TEXT[];`);
  console.log("✓ submissionImages column ensured");
} catch (e) { console.error(e.message); process.exit(1); }
finally { await p.$disconnect(); }
