import { chromium, type Request } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { prisma } from "@agents-go/db";

// Submits an agent's deliverable to a GO bounty using the saved X session.
//
//   pnpm go-submit <taskId>            # dry run: fill the form, capture the
//                                      # submit API call, but STOP before paying
//   pnpm go-submit <taskId> --pay      # actually pay the fee + submit (real, irreversible)
//
// Either way we log every pump.fun network request so we learn the exact
// submit endpoint, headers and body.

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH = resolve(__dirname, "../x-auth.json");

async function main() {
  const taskId = process.argv[2];
  const doPay = process.argv.includes("--pay");
  const headed = process.argv.includes("--headed");
  if (!taskId) throw new Error("usage: pnpm go-submit <taskId> [--pay] [--headed]");
  if (!existsSync(AUTH)) throw new Error(`no session at ${AUTH} — run: pnpm x-login`);

  // pull the agent's produced answer for this bounty
  const claim = await prisma.agentClaim.findFirst({
    where: { taskId },
    orderBy: { claimedAt: "desc" },
  });
  const answer = claim?.answerText;
  if (!answer) throw new Error(`no agent answer for ${taskId} — run the agent first`);

  const browser = await chromium.launch({ headless: !headed && !doPay });
  const ctx = await browser.newContext({ storageState: AUTH });
  const page = await ctx.newPage();

  // capture every pump.fun API call — this is how we learn the submit endpoint
  const captured: { method: string; url: string; body?: string }[] = [];
  page.on("request", (req: Request) => {
    const u = req.url();
    if (/pump\.fun|livestream-api|amazonaws/.test(u) && req.method() !== "GET") {
      captured.push({ method: req.method(), url: u, body: req.postData() ?? undefined });
    }
  });

  await page.goto(`https://pump.fun/go/${taskId}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const submitBtn = page.getByRole("button", { name: /submit work/i });
  if (!(await submitBtn.count())) {
    console.error("✗ no 'Submit work' button — session may be dead. Run pnpm x-verify");
    await dump(captured, browser);
    return;
  }
  await submitBtn.first().click();
  await page.waitForTimeout(1500);

  // fill the description with the agent's deliverable
  const desc = page.getByRole("textbox", { name: /description/i });
  await desc.fill(answer.slice(0, 4000));
  // agree to terms
  const agree = page.getByRole("checkbox", { name: /agree/i });
  if (await agree.count()) await agree.first().check();
  await page.waitForTimeout(800);

  if (!doPay) {
    console.log("\n🔎 DRY RUN — form filled, stopping before 'Pay and submit'.");
    console.log("   (pass --pay to actually pay the fee and submit)\n");
    await dump(captured, browser);
    return;
  }

  // real submit
  const pay = page.getByRole("button", { name: /pay and submit/i });
  await pay.first().click();
  console.log("⏳ clicked Pay and submit — watching for wallet / confirmation…");
  await page.waitForTimeout(8000);
  console.log("→ check the browser: a wallet signature may be required.");
  await dump(captured, browser);

  if (claim) {
    await prisma.agentClaim.update({
      where: { id: claim.id },
      data: { state: "SUBMITTED", submittedAt: new Date() },
    });
  }
}

async function dump(captured: { method: string; url: string; body?: string }[], browser: import("playwright").Browser) {
  console.log("\n──────── captured pump.fun POST/PUT requests ────────");
  if (captured.length === 0) console.log("  (none captured)");
  for (const c of captured) {
    console.log(`  ${c.method} ${c.url}`);
    if (c.body) console.log(`     body: ${c.body.slice(0, 300)}`);
  }
  console.log("─────────────────────────────────────────────────────\n");
  await prisma.$disconnect();
  await browser.close();
}

main().catch((e) => { console.error("submit error:", e); process.exit(1); });
