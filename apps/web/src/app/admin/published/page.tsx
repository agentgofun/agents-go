import { getPublished } from "@/lib/admin-data";
import UnpublishButton from "../_components/UnpublishButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublishedPage() {
  const rows = await getPublished();

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>published</h1>
      </div>
      {rows.length === 0 && <div className="admin-empty">nothing published yet.</div>}
      <table className="admin-table">
        <thead>
          <tr>
            <th>bounty</th>
            <th>reward</th>
            <th>submission link</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.bounty.title}</td>
              <td>{c.bounty.rewardTotalUsd ? `$${Math.round(c.bounty.rewardTotalUsd).toLocaleString()}` : "—"}</td>
              <td>
                {c.submissionUrl ? (
                  <a href={c.submissionUrl} target="_blank" rel="noreferrer">
                    {c.submissionUrl.slice(0, 48)}…
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td>
                <UnpublishButton id={c.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
