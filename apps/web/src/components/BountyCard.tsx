interface Props {
  taskId: string;
  title: string;
  body: string;
  rewardUsd: number | null;
  rewardSol: number;
  submissionCount: number;
  expiresAt: string | null;
  xVerified: boolean | null;
  xFollowers: number | null;
}

// Read-only bounty card. The agent picks bounties itself (via the worker) — there
// is no manual "take it" action.
export function BountyCard(p: Props) {
  const goUrl = `https://pump.fun/go/${p.taskId}`;

  return (
    <a className="card" href={goUrl} target="_blank" rel="noreferrer" style={{ display: "block" }}>
      <div className="row1">
        <span className="ttl">{p.title}</span>
        <div className="reward">
          <div className="usd">{p.rewardUsd ? `$${Math.round(p.rewardUsd).toLocaleString()}` : "—"}</div>
          {p.rewardSol > 0 && <div className="sol">{p.rewardSol.toFixed(2)} SOL</div>}
        </div>
      </div>
      <div className="body">{p.body}</div>
      <div className="meta">
        <span className="chip">{p.submissionCount} subs</span>
        {p.expiresAt && <span className="chip">ends {new Date(p.expiresAt).toLocaleDateString()}</span>}
        {p.xVerified && <span className="chip">✓ X</span>}
        {p.xFollowers != null && <span>{p.xFollowers} followers</span>}
      </div>
    </a>
  );
}
