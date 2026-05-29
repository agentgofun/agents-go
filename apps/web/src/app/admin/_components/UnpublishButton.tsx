"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UnpublishButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function unpublish() {
    if (!confirm("Revert to the publish queue?")) return;
    setBusy(true);
    await fetch(`/api/admin/claims/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "unpublish" }),
    });
    router.refresh();
  }
  return (
    <button className="admin-mini" disabled={busy} onClick={unpublish}>
      unpublish
    </button>
  );
}
