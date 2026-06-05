import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agents-go/db";
import { fetchSubmission } from "@agents-go/shared";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/admin/claims/[id]
//   { submissionUrl }     -> mark PUBLISHED with the GO submission link
//   { action: "unpublish" } -> revert to AWAITING_PUBLISH (operator fixing a mistake)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (body?.action === "unpublish") {
    await prisma.agentClaim.update({
      where: { id },
      data: { state: "AWAITING_PUBLISH", submissionUrl: null, publishedAt: null },
    });
    return NextResponse.json({ ok: true });
  }

  const url = typeof body?.submissionUrl === "string" ? body.submissionUrl.trim() : "";
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "valid submissionUrl required" }, { status: 400 });
  }

  // Pull the real photo(s)/video(s) + text from the GO submission so the public
  // card shows proof. Keep the agent's own answer if the submission has no text.
  let media: string[] = [];
  let text: string | null = null;
  try {
    const sub = await fetchSubmission(url);
    media = sub.media;
    text = sub.text;
  } catch {
    // non-fatal: still publish even if the fetch fails
  }

  const claim = await prisma.agentClaim.findUnique({ where: { id } });
  await prisma.agentClaim.update({
    where: { id },
    data: {
      submissionUrl: url,
      submissionImages: media,
      answerText: text ?? claim?.answerText ?? null,
      state: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true, media: media.length, text: !!text });
}

// DELETE /api/admin/claims/[id] -> drop the claim entirely (agent re-picks later)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(req);
  if (guard) return guard;
  const { id } = await params;
  await prisma.agentClaim.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
