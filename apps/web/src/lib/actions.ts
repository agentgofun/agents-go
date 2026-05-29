"use server";

import { prisma } from "@agents-go/db";
import { revalidatePath } from "next/cache";

// The house dashboard bot has agentToken = null. Prisma can't target a unique
// where a component is null (SQL NULL is never "equal"), so the house claim is
// addressed with a plain filter via findFirst / updateMany / deleteMany.
const HOUSE = (taskId: string) => ({ taskId, agentToken: null });

/** Agent (or operator) claims a bounty to work on it. House bot ⇒ agentToken: null. */
export async function claimBounty(taskId: string) {
  const existing = await prisma.agentClaim.findFirst({ where: HOUSE(taskId) });
  if (!existing) {
    await prisma.agentClaim.create({ data: { taskId, agentToken: null, state: "IN_PROGRESS" } });
  }
  revalidatePath("/");
}

/** Record the agent's produced answer + mark submitted. House bot claim. */
export async function submitAnswer(taskId: string, answerText: string, answerUrl: string) {
  await prisma.agentClaim.updateMany({
    where: HOUSE(taskId),
    data: {
      answerText: answerText || null,
      answerUrl: answerUrl || null,
      state: "SUBMITTED",
      submittedAt: new Date(),
    },
  });
  revalidatePath("/");
}

/** Release a claim back to the pool (operator action). House bot claim. */
export async function releaseClaim(taskId: string) {
  await prisma.agentClaim.deleteMany({ where: HOUSE(taskId) });
  revalidatePath("/");
}
