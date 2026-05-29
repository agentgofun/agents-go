import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

// Uses a saved X session (x-auth.json with x.com cookies) to log into pump.fun GO
// via "Sign in → Continue with X". Because the X session is already valid, the
// OAuth handshake should go through WITHOUT password/captcha. Then we save the
// FULL session (now including pump.fun/Privy cookies) back to x-auth.json.
//
//   pnpm go-login            # headed so you can watch / click wallet if needed

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH = resolve(__dirname, "../x-auth.json");

import { createInterface } from "node:readline";
function waitEnter(p: string): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => rl.question(p, () => { rl.close(); r(); }));
}

async function main() {
  if (!existsSync(AUTH)) throw new Error(`no ${AUTH} — run convert-cookies first`);

  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ storageState: AUTH });
  const page = await ctx.newPage();

  await page.goto("https://pump.fun/go", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // already logged in?
  if (await page.getByRole("button", { name: /wallet|profile/i }).count()) {
    console.log("✅ already logged into GO — saving full session.");
    await ctx.storageState({ path: AUTH });
    await browser.close();
    return;
  }

  // click Sign in
  const signIn = page.getByRole("button", { name: /sign in/i });
  if (await signIn.count()) {
    await signIn.first().click();
    await page.waitForTimeout(1500);
    // look for "Continue with X" / Twitter option in the Privy modal
    const xBtn = page.getByRole("button", { name: /(continue with )?(x|twitter)/i });
    if (await xBtn.count()) {
      console.log("→ clicking 'Continue with X' (X session should auto-authorize)…");
      await xBtn.first().click();
    }
  }

  console.log(`
┌──────────────────────────────────────────────────────────────┐
│  Watch the visible browser.                                   │
│  • If X auto-authorizes → you'll land back on GO logged in.   │
│  • If it asks to "Authorize app" → click Authorize.           │
│  • Connect/confirm the wallet if prompted.                    │
│  When you see your profile on GO, press Enter here.           │
└──────────────────────────────────────────────────────────────┘
`);
  await waitEnter("Press Enter once logged into GO… ");

  await ctx.storageState({ path: AUTH });
  console.log(`\n✅ full session (with pump.fun cookies) saved to ${AUTH}`);
  console.log("   verify: pnpm x-verify\n");
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
