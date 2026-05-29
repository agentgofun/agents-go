/**
 * Одноразовый скрипт для захвата X auth-state.
 *
 * Запуск:
 *   tsx scripts/x-login-capture.ts
 *
 * Откроется ВИДИМОЕ окно Chromium на x.com/login. Ты руками логинишься
 * (можно с 2FA), убеждаешься что сидишь в свой ленте, потом нажимаешь Enter
 * в терминале — скрипт сохранит cookies + localStorage в `x-auth.json`.
 *
 * Файл `x-auth.json` дальше используется в src/twitter.ts через
 *   newContext({ storageState: 'x-auth.json' })
 *
 * ВАЖНО: НЕ коммитить x-auth.json в git! Добавь в .gitignore.
 * На Railway: положить содержимое x-auth.json в env X_AUTH_JSON (одной строкой),
 * src/twitter.ts будет читать его из env.
 */
import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { writeFile } from 'node:fs/promises';

const OUT = 'x-auth.json';

async function waitForEnter(prompt: string) {
  return new Promise<void>((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

async function main() {
  console.log('Launching VISIBLE Chromium. Log into X as usual, then come back here.\n');
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
  });
  const page = await ctx.newPage();
  await page.goto('https://x.com/login');

  await waitForEnter('After successful login (you see your home feed) press Enter here…\n');

  // Сохраняем полный auth state (cookies + localStorage + sessionStorage)
  const state = await ctx.storageState();
  await writeFile(OUT, JSON.stringify(state, null, 2));
  console.log(`\n✅ Saved auth state to ${OUT}`);
  console.log(`   cookies: ${state.cookies.length}, origins: ${state.origins.length}`);
  console.log('\nNow:');
  console.log('  1) Verify it works:  npx tsx scripts/x-verify-auth.ts');
  console.log(`  2) Add to .gitignore:  echo '${OUT}' >> .gitignore`);
  console.log('  3) For Railway:  copy contents one-line into env X_AUTH_JSON');

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
