"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ next }: { next?: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.push(next || "/admin/queue");
      router.refresh();
    } else {
      setError(true);
    }
  }

  return (
    <div className="admin-login">
      <form onSubmit={submit} className="admin-login-card">
        <div className="admin-login-brand">
          agent<span>.GO</span> · operator
        </div>
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <div className="admin-login-err">wrong password</div>}
        <button type="submit" disabled={busy}>
          {busy ? "…" : "enter"}
        </button>
      </form>
    </div>
  );
}
