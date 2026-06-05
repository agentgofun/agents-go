"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BountyOption {
  taskId: string;
  title: string;
  rewardTotalUsd: number | null;
}

export default function AddPublishedForm({ bounties }: { bounties: BountyOption[] }) {
  const [taskId, setTaskId] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function add() {
    if (!taskId) {
      setMsg("pick a bounty first");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setMsg("paste a valid GO submission link");
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/published", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskId, submissionUrl: url }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(`published ✓ (${data.media ?? 0} media parsed)`);
      setTaskId("");
      setUrl("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error ?? "failed — check the link");
    }
  }

  return (
    <div className="add-pub">
      <div className="add-pub-head">add a published entry manually</div>
      <div className="add-pub-row">
        <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          <option value="">— select bounty —</option>
          {bounties.map((b) => (
            <option key={b.taskId} value={b.taskId}>
              {b.rewardTotalUsd ? `$${Math.round(b.rewardTotalUsd).toLocaleString()} · ` : ""}
              {b.title}
            </option>
          ))}
        </select>
        <input
          type="url"
          placeholder="paste pump.fun GO submission link…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button disabled={busy} onClick={add}>
          {busy ? "…" : "+ add to published"}
        </button>
      </div>
      {msg && <div className="add-pub-msg">{msg}</div>}
    </div>
  );
}
