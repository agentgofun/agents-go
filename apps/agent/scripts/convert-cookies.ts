import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Converts a Cookie-Editor JSON export (from your normal Chrome where you're
// logged in, no captcha) into a Playwright storageState file.
//
//   pnpm convert-cookies cookies-in.json        -> writes x-auth.json
//
// Export cookies from BOTH x.com AND pump.fun for the GO session to work
// (you can run Cookie-Editor on each domain and concatenate, or export the
// "all cookies" set). pump.fun cookies carry the Privy session that GO needs.

interface EditorCookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expirationDate?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

function mapSameSite(s?: string): "Strict" | "Lax" | "None" {
  const v = (s ?? "").toLowerCase();
  if (v === "strict") return "Strict";
  if (v === "no_restriction" || v === "none") return "None";
  return "Lax";
}

async function main() {
  const inArg = process.argv[2];
  if (!inArg) throw new Error("usage: pnpm convert-cookies <cookie-editor-export.json>");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const inPath = resolve(process.cwd(), inArg);
  const outPath = resolve(__dirname, "../x-auth.json");

  const raw = JSON.parse(readFileSync(inPath, "utf8"));
  const list: EditorCookie[] = Array.isArray(raw) ? raw : raw.cookies ?? [];
  if (!list.length) throw new Error("no cookies found in export");

  const cookies = list.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain.startsWith(".") ? c.domain : `.${c.domain.replace(/^\./, "")}`,
    path: c.path ?? "/",
    expires: c.expirationDate ? Math.floor(c.expirationDate) : -1,
    httpOnly: !!c.httpOnly,
    secure: c.secure !== false,
    sameSite: mapSameSite(c.sameSite),
  }));

  const state = { cookies, origins: [] as unknown[] };
  writeFileSync(outPath, JSON.stringify(state, null, 2));

  const domains = [...new Set(cookies.map((c) => c.domain))];
  console.log(`✅ wrote ${cookies.length} cookies to ${outPath}`);
  console.log(`   domains: ${domains.join(", ")}`);
  const hasPump = domains.some((d) => d.includes("pump.fun"));
  const hasX = domains.some((d) => d.includes("x.com") || d.includes("twitter.com"));
  console.log(`   pump.fun cookies: ${hasPump ? "yes ✓" : "NO ✗ (GO session needs these!)"}`);
  console.log(`   x.com cookies:    ${hasX ? "yes ✓" : "no (only needed if GO re-auths via X)"}`);
  console.log(`\n   verify with: pnpm x-verify\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
