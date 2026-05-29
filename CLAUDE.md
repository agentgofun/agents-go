# CLAUDE.md

> Отвечай пользователю **на русском** всегда.

## Проект: agents.go

**Идея.** Платформа AI-агентов, которые выполняют баунти на **pump fun GO** (go.pump.fun → редиректит на pump.fun/go — bounty-маркетплейс pump.fun, «Pay ANYONE to do ANYTHING», анонс 2026-06-04).

**Два контура:**
1. **Первичный (token-driven, real yield):** собственные агенты проекта фармят GO-баунти. Заработок → **50% buyback** токена + **50% распределяется холдерам**. Главный месседж холдерам — пассивный доход от реального труда агентов.
2. **Вторичный (SaaS):** юзеры разворачивают своих агентов, проект берёт **20%** с их заработка.

**Рабочий флоу (operator-in-the-loop на публикации):**
1. **Агент-воркер** (`apps/agent` worker.ts) сам берёт открытые баунти (богатейшие первыми), решает через **Claude Haiku** (tool_use, структурированный deliverable по каждому критерию, НИКОГДА не отказывается — видео/картинки → план + Higgsfield-промпт), ставит claim в `AWAITING_PUBLISH`.
2. **Оператор** заходит в **админ-панель `/admin`** (пароль `ADMIN_PASSWORD`, дефолт 1111) → видит очередь решений → копирует deliverable → **сам публикует на pump.fun GO** руками → получает ссылку сабмишена → вставляет её в карточку → `mark published` (state=PUBLISHED).
3. **Публичный дашборд** показывает решение + **ссылку-пруф** (submissionUrl) в колонке «published on GO».

**Почему так, а не автосабмит:** GO требует **X OAuth на каждый сабмит** (`x.com/i/oauth2/authorize` → `pump.fun/api/x/callback`, scope users.read+tweet.read) — анти-бот стена. Автоматизировать X-вход не вышло (rate-limit + httpOnly cookies). Поэтому публикацию делает человек, а агент автономно производит работу. Подробности механики submit — в reference-go-onchain памяти.

**Этап 3 (позже):** токеномика — buyback + дистрибуция (50/50).

**Жёсткое правило: всё реально, ноль фейка.** Баунти — из живого API GO, выплаты — on-chain. Никаких мок-данных. Кнопки «agent: take it» НЕТ — агент сам выбирает баунти (worker).

## Как устроен pump fun GO (важно для интеграции)

- **API (открытый, read-only):** база `https://livestream-api.pump.fun/bounties`
  - `GET /v2/tasks?phase=<PHASE>&sort=rewardTotalUsd&order=desc&limit=N` — список баунти. Фазы: `OPEN, PENDING_RESOLUTION, CLOSED, IN_DISPUTE_PERIOD`. **Активные/открытые баунти приходят как `PENDING_RESOLUTION`** (не OPEN — это терминология GO). Ответ `{items:[...]}`.
  - `GET /v2/stats` → `{liveCount, unclaimedRewardTotalUsd, submissionCount}`. Также `/v2/top-earners`, `/v2/top-spenders`, `/feed/trending`, `/v2/submissions/count`.
  - Поля task: `taskId, creatorAddress, title, bodyMarkdown, criteria[], rewardLegs[] (mintAddress, rewardVaultAddress=Squads-vault, amountAtomic, decimalsSnapshot), rewardTotalUsd, attachments[] (S3), status, expiresAt, counts.submissionCount, onChainBountyId, creatorXFollowerCount/Verified`. Награды бывают в SOL **и** в pump-токенах.
- **On-chain:** GO = **надстройка над Squads Protocol v4** (`SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`). Каждый баунти = Squads-vault. Программа GO `goGzNYTYkSEe4hUqz6dPmY5uf3CTt36AQAoujXDrKiV` логирует решения: эмитит event **`RecordDecision`** (disc `5a4e4983f2c3178e`: vault pubkey + submitter pubkey + u64 ts + статус-байт). `PaySubmissionFee` — сабмиттер платит фикс комиссию.
- **Стена:** приёмка сабмишенов **ручная у пампфана** (RecordDecision подписывает их ключ). Полностью автономный «нашёл→выполнил→забрал» невозможен — между выполнением и выплатой стоит их модератор. Это риск-фактор, отражаем холдерам честно.

## Стек и структура

Монорепо (pnpm workspace, Node 25, TypeScript, ESM).

```
agents.go/
├── apps/web        — Next.js 15 (App Router, React 19) дашборд :3100
│                     3 колонки: ALL BOUNTIES ON GO / AGENT WORKING / COMPLETED
│                     server actions: claimBounty, submitAnswer, releaseClaim
│                     стиль: терминально-агентский, тёмная база, зелёный (--go) намёк на GO, моно-шрифт
├── apps/indexer    — воркер: poll livestream-api все фазы → upsert в Neon (poll INDEXER_POLL_MS=30s)
├── packages/shared — типы GO API (go-types.ts) + клиент GoClient (go-client.ts)
└── packages/db     — Prisma (Postgres/Neon): Bounty, AgentClaim, Payout
                      ClaimState: IN_PROGRESS → SUBMITTED → WON|LOST
```

**Инфра:**
- БД: **Neon Postgres** (`DATABASE_URL` в `.env`).
- RPC/gRPC: **Triton** (`TRITON_GRPC_ENDPOINT`, `TRITON_GRPC_TOKEN`) — для on-chain трекинга выплат (фаза 2, паттерн из grpc-watcher скилла).
- AI агент: **Claude Sonnet** (`ANTHROPIC_MODEL=claude-sonnet-4-6`) — фаза 2.
- Кошелёк агента: `AGENT_WALLET_SECRET` — **dev/тест, ротировать перед продом** (засветился в чате).

**Запуск:**
- `pnpm --filter @agents-go/indexer once` — разовая синхронизация баунти. `... start`/`dev` — постоянный poll.
- `pnpm --filter @agents-go/db exec prisma db push` — применить схему (env через `--env-file` / source .env).
- web dev: `apps/web/.env.local` → симлинк на корневой `.env` (Next читает нативно). `pnpm exec next dev -p 3100`.

**Грабли (уже наступили):**
- pnpm 11 блокирует build-скрипты → `onlyBuiltDependencies` в `pnpm-workspace.yaml` (prisma, esbuild, sharp). НЕ давать линтеру писать туда плейсхолдер `allowBuilds`.
- `--env-file` в `NODE_OPTIONS` запрещён node → для web используем симлинк `.env.local`, для indexer — `tsx --env-file=../../.env`.

## Что сделано (этап 1)
Дашборд + индексер работают на реальных данных: 140 баунти в Neon, web рендерит 122 live, claim/answer/release функционируют (проверено в браузере). Дальше — этап 2 (AI-бот выполнения) и подготовка вскрытия submit/claim API GO под X-аккаунтом.

---

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
