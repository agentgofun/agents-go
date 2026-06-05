import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agents-go/db";
import { fetchSubmission } from "@agents-go/shared";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/admin/published
//   { taskId, submissionUrl } -> manually create a PUBLISHED entry for an
//   existing bounty: the operator pastes a GO submission link, we parse its
//   photos/videos and surface the card on the public board. Same end state as
//   the agent queue flow, just operator-initiated.
export async function POST(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  const taskId = typeof body?.taskId === "string" ? body.taskId.trim() : "";
  const url = typeof body?.submissionUrl === "string" ? body.submissionUrl.trim() : "";

  if (!taskId) {
    return NextResponse.json({ error: "taskId required" }, { status: 400 });
  }
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "valid submissionUrl required" }, { status: 400 });
  }

  // The bounty must exist (it's indexed from GO) — keeps entries tied to real bounties.
  const bounty = await prisma.bounty.findUnique({ where: { taskId } });
  if (!bounty) {
    return NextResponse.json({ error: "bounty not found for that taskId" }, { status: 404 });
  }

  // Pull photos/videos AND the submission text from GO so the public card shows
  // full proof (the operator only pastes a link).
  let media: string[] = [];
  let text: string | null = null;
  try {
    const sub = await fetchSubmission(url);
    media = sub.media;
    text = sub.text;
  } catch {
    // non-fatal: still publish even if the fetch fails
  }

  // Upsert the house claim (agentToken null) for this bounty straight to PUBLISHED.
  const existing = await prisma.agentClaim.findFirst({
    where: { taskId, agentToken: null },
  });

  if (existing) {
    await prisma.agentClaim.update({
      where: { id: existing.id },
      data: {
        submissionUrl: url,
        submissionImages: media,
        answerText: text ?? existing.answerText,
        state: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  } else {
    await prisma.agentClaim.create({
      data: {
        taskId,
        agentToken: null,
        state: "PUBLISHED",
        submissionUrl: url,
        submissionImages: media,
        answerText: text,
        submittedAt: new Date(),
        publishedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true, media: media.length, text: !!text });
}
