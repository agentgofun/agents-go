import { DocsAside } from "@/components/DocsAside";
import { SiteFooter } from "@/components/SiteFooter";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="docs">
        <DocsAside />
        <main className="docs-main">{children}</main>
      </div>
      <SiteFooter />
    </>
  );
}
