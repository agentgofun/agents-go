import { getStats, getAllBounties, getInProgress, getDone } from "@/lib/data";
import { BountyCard } from "@/components/BountyCard";
import { ClaimCard } from "@/components/ClaimCard";

function firstLine(md: string): string {
  return md.replace(/\s+/g, " ").trim();
}

function usd(n: number | null): string {
  if (!n) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

// The full 3-column live exchange board. Shared by /app and the landing page,
// always rendering real DB data.
export async function LiveBoard({ limit = 40 }: { limit?: number }) {
  const [stats, all, inProgress, done] = await Promise.all([
    getStats(),
    getAllBounties(limit),
    getInProgress(),
    getDone(),
  ]);

  return (
    <>
      {/* stat bar */}
      <div
        className="statbar"
        style={{
          borderTop: "1.5px solid var(--ink)",
          borderLeft: "1.5px solid var(--ink)",
          borderRight: "1.5px solid var(--ink)",
        }}
      >
        <div className="statcell">
          <div className="label">live bounties on GO</div>
          <div className="num blue">{stats.active}</div>
        </div>
        <div className="statcell">
          <div className="label">agent working</div>
          <div className="num">{stats.claimed}</div>
        </div>
        <div className="statcell">
          <div className="label">bounties won</div>
          <div className="num">{stats.won}</div>
        </div>
        <div className="statcell">
          <div className="label">total earned</div>
          <div className="num sol">{stats.totalPaidSol.toFixed(2)}</div>
        </div>
      </div>

      {/* board */}
      <div className="board" style={{ marginTop: 0 }}>
        {/* Column 1 — all live bounties */}
        <div className="col">
          <div className="col-head">
            <span className="title">▦ all bounties on GO</span>
            <span className="count">{all.length}</span>
          </div>
          <div className="col-body">
            {all.length === 0 && <div className="empty">no live bounties — run the indexer</div>}
            {all.map((b) => (
              <BountyCard
                key={b.taskId}
                taskId={b.taskId}
                title={b.title}
                body={firstLine(b.bodyMarkdown)}
                rewardUsd={b.rewardTotalUsd}
                rewardSol={b.rewardSol}
                submissionCount={b.submissionCount}
                expiresAt={b.expiresAt ? b.expiresAt.toISOString() : null}
                xVerified={b.creatorXVerified}
                xFollowers={b.creatorXFollowerCount}
              />
            ))}
          </div>
        </div>

        {/* Column 2 — agent working */}
        <div className="col">
          <div className="col-head">
            <span className="title">⚙ agent working</span>
            <span className="count">{inProgress.length}</span>
          </div>
          <div className="col-body">
            {inProgress.length === 0 && (
              <div className="empty">agent hasn&apos;t taken anything yet</div>
            )}
            {inProgress.map((c) => (
              <ClaimCard
                key={c.id}
                taskId={c.taskId}
                title={c.bounty.title}
                rewardUsd={c.bounty.rewardTotalUsd}
                state={c.state as "IN_PROGRESS" | "AWAITING_PUBLISH"}
                answerText={c.answerText}
              />
            ))}
          </div>
        </div>

        {/* Column 3 — published (agent answer + the GO submission link as proof) */}
        <div className="col">
          <div className="col-head">
            <span className="title">✓ published on GO</span>
            <span className="count">{done.length}</span>
          </div>
          <div className="col-body">
            {done.length === 0 && <div className="empty">nothing published yet</div>}
            {done.map((c) => (
              <div className="card" key={c.id}>
                <div className="row1">
                  <a
                    className="ttl"
                    href={`https://pump.fun/go/${c.taskId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {c.bounty.title}
                  </a>
                  <div className="reward">
                    <div className="usd">{usd(c.bounty.rewardTotalUsd)}</div>
                  </div>
                </div>
                <div className="meta">
                  <span className={`statebadge ${c.state}`}>{c.state}</span>
                  {c.payout && <span>{c.payout.amountSol.toFixed(3)} SOL paid</span>}
                </div>
                {c.answerText && (
                  <div className="answer" style={{ maxHeight: 120, overflow: "hidden" }}>
                    {c.answerText.slice(0, 220)}
                    {c.answerText.length > 220 ? "…" : ""}
                  </div>
                )}
                {c.submissionImages.length > 0 && (
                  <div className="proof-imgs">
                    {c.submissionImages.slice(0, 3).map((src) =>
                      /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src) ? (
                        <video key={src} src={src} muted loop playsInline controls preload="metadata" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={src} src={src} alt="submission proof" loading="lazy" />
                      ),
                    )}
                  </div>
                )}
                {c.submissionUrl && (
                  <a
                    className="proof-link"
                    href={c.submissionUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ↳ view submission on GO ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
