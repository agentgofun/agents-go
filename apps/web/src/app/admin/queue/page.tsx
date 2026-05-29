import { getQueue, getAdminCounts } from "@/lib/admin-data";
import QueueCard from "../_components/QueueCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function QueuePage() {
  const [queue, counts] = await Promise.all([getQueue(), getAdminCounts()]);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>publish queue</h1>
        <div className="admin-stat-row">
          <span>{counts.working} working</span>
          <span className="hot">{counts.queue} awaiting publish</span>
          <span>{counts.published} published</span>
        </div>
      </div>
      <p className="admin-hint">
        The agent finished these. Copy each deliverable, post it on pump.fun GO yourself, then paste
        the submission link and hit <b>mark published</b> — it goes live on the public board.
      </p>

      {queue.length === 0 && (
        <div className="admin-empty">
          nothing awaiting publish. Run <code>pnpm worker</code> to have the agent pick bounties.
        </div>
      )}

      <div className="qlist">
        {queue.map((c) => (
          <QueueCard
            key={c.id}
            id={c.id}
            taskId={c.taskId}
            title={c.bounty.title}
            rewardUsd={c.bounty.rewardTotalUsd}
            answerText={c.answerText ?? ""}
            summary={c.notes}
          />
        ))}
      </div>
    </div>
  );
}
