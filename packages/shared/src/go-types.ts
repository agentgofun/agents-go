// Types mirror the real pump fun GO API (livestream-api.pump.fun/bounties).
// Reverse-engineered from live responses on 2026-06-05.

export type BountyPhase = "OPEN" | "PENDING_RESOLUTION" | "CLOSED" | "IN_DISPUTE_PERIOD";

export interface BountyCriterion {
  id: string;
  text: string;
  required: boolean;
  order: number;
}

export interface BountyRewardLeg {
  amountAtomic: string; // u64 as string
  remainingAmountAtomic: string;
  mintAddress: string; // SOL = So111...112, or a pump-token mint
  tokenProgramId: string;
  rewardVaultAddress: string; // Squads vault holding the reward
  decimalsSnapshot: number;
}

export interface BountyRewardLegUsd {
  mintAddress: string;
  priceUsd: number;
  usdValue: number;
  priced: boolean;
}

export interface BountyAttachment {
  filename: string;
  size: number;
  kind: string; // "image", ...
  contentType: string;
  key: string;
  url: string; // S3 url
}

export interface BountyCounts {
  submissionCount: number;
  disputeCount: number;
}

export interface ChainConfigSnapshot {
  publishFeeLamports: string;
  disputeSlashBps: number;
  disputeWindowSeconds: string;
  disputeFeeLamports: string;
  submissionFeeLamports: string;
}

// A single bounty (task) as returned by /v2/tasks and /feed/trending (nested in .bounty)
export interface GoBounty {
  taskId: string;
  creatorAddress: string;
  title: string;
  bodyMarkdown: string;
  criteria: BountyCriterion[];
  submissionVisibility: string; // "PUBLIC" | ...
  rewardDistribution?: { type: string }; // e.g. ONE_WINNER
  rewardLegs: BountyRewardLeg[];
  rewardLegsUsd?: BountyRewardLegUsd[];
  rewardTotalUsd?: number;
  rewardPricedAt?: string;
  attachments?: BountyAttachment[];
  coinAddress?: string;
  status: BountyPhase;
  createdAt: string;
  expiresAt: string;
  publishedAt?: string;
  fundedAt?: string;
  counts: BountyCounts;
  likeCount?: number;
  onChainBountyId?: string;
  pumpBountiesProgramId?: string;
  chainConfigSnapshot?: ChainConfigSnapshot;
  creatorXFollowerCount?: number;
  creatorXVerified?: boolean;
}

export interface GoTasksResponse {
  items: GoBounty[];
  total?: number;
  facets?: unknown;
}

export interface GoStats {
  liveCount: number;
  unclaimedRewardTotalUsd: number;
  submissionCount: number;
}

export interface GoEarner {
  address: string;
  totalEarnedUsd: number;
  payoutCount: number;
  lastPayedOutAt: string;
}

export interface GoEarnersResponse {
  items: GoEarner[];
  windowDays: number;
  computedAt: string;
}

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const GO_PROGRAM_ID = "goGzNYTYkSEe4hUqz6dPmY5uf3CTt36AQAoujXDrKiV";
export const SQUADS_PROGRAM_ID = "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf";
