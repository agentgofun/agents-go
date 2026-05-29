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

  /** List bounties for a phase, sorted by reward desc by default. */
  async tasks(opts: {
    phase?: BountyPhase | BountyPhase[];
    sort?: string;
    order?: "asc" | "desc";
    limit?: number;
  } = {}): Promise<GoBounty[]> {
    const params: Record<string, string | number> = {
      sort: opts.sort ?? "rewardTotalUsd",
      order: opts.order ?? "desc",
      limit: opts.limit ?? 50,
    };
    if (opts.phase) {
      params.phase = Array.isArray(opts.phase) ? opts.phase.join(",") : opts.phase;
    }
    const data = await this.get<GoTasksResponse>("/v2/tasks", params);
    return data.items ?? [];
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
 * Given a GO submission URL, fetch that submission's image attachment URLs.
 * Returns [] if the link isn't a submission URL or the submission/images aren't found.
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
    .filter((a) => (a.kind === "image" || (a.contentType ?? "").startsWith("image/")) && a.url)
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
