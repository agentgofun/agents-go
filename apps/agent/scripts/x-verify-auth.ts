import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

// Loads x-auth.json into a headless browser, opens pump.fun/go, and reports
// whether the session is still alive (profile/wallet visible, not "Sign in").

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH = resolve(__dirname, "../x-auth.json");

async function main() {
  if (!existsSync(AUTH)) {
    console.error(`✗ no session file at ${AUTH} — run: pnpm x-login`);
    process.exit(1);
  }
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: AUTH });
  const page = await ctx.newPage();
  await page.goto("https://pump.fun/go", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  const hasSignIn = await page.getByRole("button", { name: /sign in/i }).count();
  const hasWallet = await page.getByRole("button", { name: /wallet/i }).count();
  const hasProfile = await page.getByRole("button", { name: /profile/i }).count();

  if (hasWallet || hasProfile) {
    console.log("✅ session ALIVE — logged in (wallet/profile present)");
  } else if (hasSignIn) {
    console.log("✗ session DEAD — 'Sign in' shown. Re-run: pnpm x-login");
  } else {
    console.log("? inconclusive — page may not have settled. Check manually.");
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
