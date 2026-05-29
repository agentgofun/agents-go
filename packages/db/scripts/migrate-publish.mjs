import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  await p.$executeRawUnsafe(`ALTER TABLE "AgentClaim" ADD COLUMN IF NOT EXISTS "submissionUrl" TEXT;`);
  await p.$executeRawUnsafe(`ALTER TABLE "AgentClaim" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);`);
  console.log("✓ columns submissionUrl, publishedAt ensured");
  // add new enum values (Postgres: ADD VALUE IF NOT EXISTS, must be outside txn — run separately)
  for (const v of ["AWAITING_PUBLISH", "PUBLISHED"]) {
    try {
      await p.$executeRawUnsafe(`ALTER TYPE "ClaimState" ADD VALUE IF NOT EXISTS '${v}';`);
      console.log(`✓ enum value ${v} ensured`);
    } catch (e) { console.log(`  (${v}: ${e.message.slice(0,60)})`); }
  }
  console.log("DONE");
} catch (e) { console.error("migration error:", e.message); process.exit(1); }
finally { await p.$disconnect(); }
