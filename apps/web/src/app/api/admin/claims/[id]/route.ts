import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agents-go/db";
import { fetchSubmissionImages } from "@agents-go/shared";
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

  // Pull the real photo(s) from the GO submission so the public card shows proof.
  let images: string[] = [];
  try {
    images = await fetchSubmissionImages(url);
  } catch {
    images = []; // non-fatal: still publish even if image fetch fails
  }

  await prisma.agentClaim.update({
    where: { id },
    data: {
      submissionUrl: url,
      submissionImages: images,
      state: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true, images: images.length });
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
