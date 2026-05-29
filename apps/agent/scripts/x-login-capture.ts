import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";

// Opens a VISIBLE browser on pump.fun/go. You log in by hand (X / email / 2FA —
// whatever works), then press Enter here. We save the full session (cookies +
// localStorage) to x-auth.json. Because YOU drive a real visible browser, X
// doesn't rate-limit/captcha it like a headless Playwright login.

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../x-auth.json");

function waitEnter(prompt: string): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(prompt, () => { rl.close(); res(); }));
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("https://pump.fun/go", { waitUntil: "domcontentloaded" });

  console.log(`
┌──────────────────────────────────────────────────────────────┐
│  A visible browser is open on pump.fun/go.                    │
│  1. Click "Sign in"  →  log in (X, email, whatever works).    │
│  2. Connect your wallet if it asks.                           │
│  3. Make sure you see your profile (not "Sign in").           │
│  Then come back here and press Enter to save the session.     │
└──────────────────────────────────────────────────────────────┘
`);

  await waitEnter("Press Enter once you are logged in… ");

  await ctx.storageState({ path: OUT });
  console.log(`\n✅ session saved to ${OUT}`);
  console.log("   (also paste its contents into X_AUTH_JSON env for Railway)\n");
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
