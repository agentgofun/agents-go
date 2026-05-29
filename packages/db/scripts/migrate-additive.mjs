import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  await p.$executeRawUnsafe(`ALTER TABLE "AgentClaim" ADD COLUMN IF NOT EXISTS "agentToken" TEXT;`);
  console.log("✓ agentToken column ensured");
  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Agent" (
      "id" TEXT PRIMARY KEY,
      "token" TEXT UNIQUE NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`);
  console.log("✓ Agent table ensured");
  await p.$executeRawUnsafe(`ALTER TABLE "AgentClaim" DROP CONSTRAINT IF EXISTS "AgentClaim_taskId_key";`);
  await p.$executeRawUnsafe(`DROP INDEX IF EXISTS "AgentClaim_taskId_key";`);
  await p.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AgentClaim_taskId_agentToken_key" ON "AgentClaim"("taskId","agentToken");`);
  console.log("✓ composite unique [taskId, agentToken] ensured");
  await p.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AgentClaim_taskId_idx" ON "AgentClaim"("taskId");`);
  console.log("✓ DONE — schema in sync, no data lost");
} catch (e) { console.error("migration error:", e.message); process.exit(1); }
finally { await p.$disconnect(); }
