"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  taskId: string;
  title: string;
  rewardUsd: number | null;
  answerText: string;
  summary: string | null;
}

export default function QueueCard(p: Props) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const goUrl = `https://pump.fun/go/${p.taskId}`;

  async function copyAnswer() {
    await navigator.clipboard.writeText(p.answerText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function markPublished() {
    if (!/^https?:\/\//i.test(url)) {
      alert("paste the pump.fun GO submission link first");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/claims/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ submissionUrl: url }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("failed — check the link");
  }

  async function drop() {
    if (!confirm("Drop this claim? The agent may re-pick the bounty later.")) return;
    setBusy(true);
    await fetch(`/api/admin/claims/${p.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="qcard">
      <div className="qcard-head">
        <div className="qcard-title">{p.title}</div>
        <div className="qcard-reward">
          {p.rewardUsd ? `$${Math.round(p.rewardUsd).toLocaleString()}` : "—"}
        </div>
      </div>
      {p.summary && <div className="qcard-summary">{p.summary}</div>}

      <div className="qcard-answer">
        <div className="qcard-answer-bar">
          <span>agent deliverable</span>
          <div className="qcard-answer-actions">
            <button onClick={copyAnswer}>{copied ? "copied ✓" : "copy"}</button>
            <a href={goUrl} target="_blank" rel="noreferrer">
              open bounty ↗
            </a>
          </div>
        </div>
        <pre className="qcard-answer-body">{p.answerText}</pre>
      </div>

      <div className="qcard-publish">
        <input
          type="url"
          placeholder="paste pump.fun GO submission link…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="qcard-go" disabled={busy} onClick={markPublished}>
          {busy ? "…" : "mark published"}
        </button>
        <button className="qcard-drop" disabled={busy} onClick={drop} title="drop claim">
          ✕
        </button>
      </div>
    </div>
  );
}
