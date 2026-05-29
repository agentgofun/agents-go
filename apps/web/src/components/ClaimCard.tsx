interface Props {
  taskId: string;
  title: string;
  rewardUsd: number | null;
  state: "IN_PROGRESS" | "AWAITING_PUBLISH";
  answerText: string | null;
}

// Read-only card for the public board's "agent working" column. Operator actions
// (publishing the answer + pasting the GO link) live in the admin panel, not here.
export function ClaimCard(p: Props) {
  const goUrl = `https://pump.fun/go/${p.taskId}`;
  const label = p.state === "AWAITING_PUBLISH" ? "answer ready" : "working";

  return (
    <div className="card">
      <div className="row1">
        <a className="ttl" href={goUrl} target="_blank" rel="noreferrer">
          {p.title}
        </a>
        <div className="reward">
          <div className="usd">{p.rewardUsd ? `$${Math.round(p.rewardUsd).toLocaleString()}` : "—"}</div>
        </div>
      </div>
      <div className="meta">
        <span className={`statebadge ${p.state}`}>{label}</span>
      </div>
      {p.state === "AWAITING_PUBLISH" && p.answerText && (
        <div className="answer" style={{ maxHeight: 120, overflow: "hidden" }}>
          {p.answerText.slice(0, 220)}
          {p.answerText.length > 220 ? "…" : ""}
        </div>
      )}
    </div>
  );
}
