import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agents-go/db";
import type { Agent } from "@agents-go/db";

export const ADMIN_COOKIE = "agentsgo_admin";
export const ADMIN_COOKIE_VALUE = "1";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "1111"; // dev default; set ADMIN_PASSWORD in prod
}

/** Returns null when authed; otherwise a 401 NextResponse to return directly. */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie !== ADMIN_COOKIE_VALUE) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Authenticates an external agent by its bearer token.
 *
 * Reads `Authorization: Bearer <token>`, looks the Agent up by token, bumps
 * lastSeenAt, and returns `{ agent }`. On a missing/unknown token it returns
 * `{ error }` carrying a ready-to-return 401 NextResponse — mirrors the
 * requireAdmin pattern so route handlers can `if ("error" in r) return r.error`.
 */
export async function requireAgent(
  req: Request,
): Promise<{ agent: Agent } | { error: NextResponse }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { error: NextResponse.json({ error: "missing bearer token" }, { status: 401 }) };
  }

  const agent = await prisma.agent.findUnique({ where: { token } });
  if (!agent) {
    return { error: NextResponse.json({ error: "unknown token" }, { status: 401 }) };
  }

  // lastSeenAt is @updatedAt, so any write touches it. Return the fresh row.
  const fresh = await prisma.agent.update({ where: { id: agent.id }, data: {} });
  return { agent: fresh };
}
