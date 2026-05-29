import { LiveBoard } from "@/components/LiveBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppBoard() {
  return (
    <div className="board-shell">
      <LiveBoard limit={60} />
    </div>
  );
}
