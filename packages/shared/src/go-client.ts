import type {
  BountyPhase,
  GoBounty,
  GoEarnersResponse,
  GoStats,
  GoTasksResponse,
} from "./go-types";

const DEFAULT_BASE = "https://livestream-api.pump.fun/bounties";

export interface GoClientOptions {
  base?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Read-only client for the public pump fun GO bounties API.
 * No auth required for reads.
 */
export class GoClient {
  private base: string;
  private fetchImpl: typeof fetch;

  constructor(opts: GoClientOptions = {}) {
    this.base = opts.base ?? DEFAULT_BASE;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(this.base + path);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    }
    const res = await this.fetchImpl(url.toString(), {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`GO API ${path} -> ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  }

  /** One page of bounties for a phase. Returns items + the cursor for the next page. */
  async tasksPage(opts: {
    phase?: BountyPhase | BountyPhase[];
    sort?: string;
    order?: "asc" | "desc";
    limit?: number;
    cursor?: string;
  } = {}): Promise<{ items: GoBounty[]; nextCursor: string | null }> {
    const params: Record<string, string | number> = {
      sort: opts.sort ?? "rewardTotalUsd",
      order: opts.order ?? "desc",
      limit: opts.limit ?? 100,
    };
    if (opts.phase) {
      params.phase = Array.isArray(opts.phase) ? opts.phase.join(",") : opts.phase;
    }
    if (opts.cursor) params.cursor = opts.cursor;
    const data = await this.get<GoTasksResponse>("/v2/tasks", params);
    return { items: data.items ?? [], nextCursor: data.nextCursor ?? null };
  }

  /** List bounties for a phase, sorted by reward desc by default (single page). */
  async tasks(opts: {
    phase?: BountyPhase | BountyPhase[];
    sort?: string;
    order?: "asc" | "desc";
    limit?: number;
  } = {}): Promise<GoBounty[]> {
    const { items } = await this.tasksPage(opts);
    return items;
  }

  /**
   * Walk the cursor pagination to fetch EVERY bounty in a phase (GO caps a page
   * at 100). Stops at maxPages as a safety bound. The GO list is cursor-based;
   * offset is ignored, so this is the only way to get all ~300 live bounties.
   */
  async allTasks(opts: {
    phase?: BountyPhase | BountyPhase[];
    sort?: string;
    order?: "asc" | "desc";
    pageSize?: number;
    maxPages?: number;
  } = {}): Promise<GoBounty[]> {
    const pageSize = opts.pageSize ?? 100;
    const maxPages = opts.maxPages ?? 20;
    const all: GoBounty[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; page < maxPages; page++) {
      const { items, nextCursor } = await this.tasksPage({
        phase: opts.phase,
        sort: opts.sort,
        order: opts.order,
        limit: pageSize,
        cursor,
      });
      let fresh = 0;
      for (const it of items) {
        if (seen.has(it.taskId)) continue;
        seen.add(it.taskId);
        all.push(it);
        fresh++;
      }
      // stop when the page is empty, there's no cursor, or it stopped advancing
      if (!nextCursor || items.length === 0 || fresh === 0) break;
      cursor = nextCursor;
    }
    return all;
  }

  async stats(): Promise<GoStats> {
    return this.get<GoStats>("/v2/stats");
  }

  async topEarners(limit = 10): Promise<GoEarnersResponse> {
    return this.get<GoEarnersResponse>("/v2/top-earners", { limit });
  }

  async topSpenders(limit = 10): Promise<GoEarnersResponse> {
    return this.get<GoEarnersResponse>("/v2/top-spenders", { limit });
  }
}

// A GO submission as returned by /v2/tasks/<taskId>/submissions
export interface GoSubmission {
  submissionId: string;
  taskId: string;
  bodyMarkdown?: string;
  attachments?: { kind?: string; contentType?: string; url?: string }[];
  likeCount?: number;
  createdAt?: string;
  publishedAt?: string;
}

/** Parse taskId + submissionId out of a pump.fun GO submission URL. */
export function parseSubmissionUrl(
  url: string,
): { taskId: string; submissionId: string } | null {
  // …/go/<taskId>/submissions/<submissionId>[#…|?…]
  const m = url.match(
    /\/go\/([0-9a-f-]{36})\/submissions\/([0-9a-f-]{36})/i,
  );
  if (!m) return null;
  return { taskId: m[1]!, submissionId: m[2]! };
}

/**
 * Given a GO submission URL, fetch that submission's media attachment URLs
 * (images AND videos). Returns [] if the link isn't a submission URL or the
 * submission/attachments aren't found.
 */
export async function fetchSubmissionImages(
  url: string,
  opts: GoClientOptions = {},
): Promise<string[]> {
  const ids = parseSubmissionUrl(url);
  if (!ids) return [];
  const base = opts.base ?? DEFAULT_BASE;
  const f = opts.fetchImpl ?? fetch;
  const res = await f(`${base}/v2/tasks/${ids.taskId}/submissions`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: GoSubmission[] } | GoSubmission[];
  const items = Array.isArray(data) ? data : data.items ?? [];
  const sub = items.find((s) => s.submissionId === ids.submissionId);
  if (!sub?.attachments) return [];
  return sub.attachments
    .filter((a) => {
      const ct = a.contentType ?? "";
      return (
        (a.kind === "image" ||
          a.kind === "video" ||
          ct.startsWith("image/") ||
          ct.startsWith("video/")) &&
        a.url
      );
    })
    .map((a) => a.url!) as string[];
}

/** Convenience: sum reward legs into a human SOL amount (SOL legs only). */
export function bountyRewardSol(b: GoBounty): number {
  let sol = 0;
  for (const leg of b.rewardLegs) {
    if (leg.mintAddress === "So11111111111111111111111111111111111111112") {
      sol += Number(leg.amountAtomic) / 10 ** leg.decimalsSnapshot;
    }
  }
  return sol;
}
