# Парсинг баунти pump fun GO — гайд для агента

> Хендофф-документ для другого Клода. Описывает, как читать/парсить/агрегировать
> баунти с pump fun GO в этом репозитории. Всё ниже основано на **реальном коде**
> (`packages/shared`, `apps/indexer`), а не на догадках. Пути к файлам — кликабельны.

Есть **два слоя данных**, не путай их:

| Слой | Что даёт | Auth | Статус в репо |
|---|---|---|---|
| **Off-chain API** (`livestream-api.pump.fun`) | текст баунти, критерии, награды, счётчики, X-метаданные | не нужен (read-only) | **реализовано** |
| **On-chain** (Solana, программа GO + Squads v4) | факт выплаты, кто принят/отклонён, реальные суммы | RPC/gRPC | **задел** (выплаты ещё не трекаются) |

Для «спарсить все баунти» нужен **только первый слой**. On-chain — для подтверждения выплат (фаза 2).

---

## 1. Off-chain: API pump fun GO

База: `https://livestream-api.pump.fun/bounties`. Полностью открыт на чтение, ключей не надо.

### Главная ловушка: фазы
Активные/открытые баунти приходят со статусом **`PENDING_RESOLUTION`**, а НЕ `OPEN`. Это терминология GO, не баг. Если фильтровать по `OPEN` — увидишь почти пусто.

```ts
export type BountyPhase = "OPEN" | "PENDING_RESOLUTION" | "CLOSED" | "IN_DISPUTE_PERIOD";
```
- `PENDING_RESOLUTION` — **живые, можно брать** (основная масса).
- `IN_DISPUTE_PERIOD` — выполнены, идёт окно спора (тоже считаем «активными» на дашборде).
- `OPEN` — редкое переходное.
- `CLOSED` — завершены.

Определение «активных» в проекте (см. [data.ts](apps/web/src/lib/data.ts#L5)):
```ts
const ACTIVE = ["PENDING_RESOLUTION", "IN_DISPUTE_PERIOD"];
```

### Эндпоинты
- `GET /v2/tasks?phase=<PHASE>&sort=rewardTotalUsd&order=desc&limit=N` — список. Ответ `{ items: GoBounty[], total? }`. `phase` принимает CSV (`PENDING_RESOLUTION,IN_DISPUTE_PERIOD`).
- `GET /v2/stats` → `{ liveCount, unclaimedRewardTotalUsd, submissionCount }`.
- `GET /v2/top-earners?limit=N`, `GET /v2/top-spenders?limit=N` → `{ items: GoEarner[] }`.
- Ещё существуют (не обёрнуты клиентом, но живые): `/feed/trending` (баунти вложен в `.bounty`), `/v2/submissions/count`.

### Готовый клиент — НЕ пиши свой
Всё уже инкапсулировано в [`GoClient`](packages/shared/src/go-client.ts). Используй его:

```ts
import { GoClient, bountyRewardSol } from "@agents-go/shared";

const client = new GoClient(); // base можно переопределить через GO_API_BASE

// все живые баунти, дороже — выше
const live = await client.tasks({
  phase: ["PENDING_RESOLUTION", "IN_DISPUTE_PERIOD"],
  limit: 100,
});

const stats = await client.stats();          // { liveCount, unclaimedRewardTotalUsd, submissionCount }
const earners = await client.topEarners(10);  // { items: GoEarner[] }
```

`client.tasks()` дефолтит `sort=rewardTotalUsd&order=desc&limit=50`. Возвращает `GoBounty[]` (уже распакованный `.items`).

### Форма одного баунти (`GoBounty`)
Полный тип — [go-types.ts](packages/shared/src/go-types.ts#L52). Ключевые поля:

```ts
interface GoBounty {
  taskId: string;            // первичный ключ. URL: https://pump.fun/go/<taskId>
  creatorAddress: string;    // Solana-адрес создателя
  title: string;
  bodyMarkdown: string;      // тело задания (markdown)
  criteria: BountyCriterion[];       // { id, text, required, order } — критерии приёмки
  rewardLegs: BountyRewardLeg[];     // награды (см. ниже) — бывает несколько
  rewardTotalUsd?: number;           // суммарно в USD (GO уже посчитал по ценам)
  rewardLegsUsd?: BountyRewardLegUsd[];
  attachments?: BountyAttachment[];  // S3-картинки и т.п.
  coinAddress?: string;              // если награда в pump-токене — его mint
  status: BountyPhase;
  createdAt: string; expiresAt: string; publishedAt?: string; fundedAt?: string;
  counts: { submissionCount: number; disputeCount: number };
  onChainBountyId?: string;          // мост к on-chain слою
  pumpBountiesProgramId?: string;
  chainConfigSnapshot?: ChainConfigSnapshot;  // комиссии (publish/submission/dispute) в lamports
  creatorXFollowerCount?: number;    // X-метаданные создателя
  creatorXVerified?: boolean;
}
```

### Парсинг наград — единственный нетривиальный момент
Награда — это **массив `rewardLegs`**, не одно число. Каждая «нога» — отдельный токен. Суммы в `amountAtomic` (u64 строкой), делить на `10 ** decimalsSnapshot`.

SOL-mint = `So11111111111111111111111111111111111111112` (экспортируется как `SOL_MINT`).

Хелпер для суммы в SOL уже есть — [`bountyRewardSol`](packages/shared/src/go-client.ts#L76):
```ts
export function bountyRewardSol(b: GoBounty): number {
  let sol = 0;
  for (const leg of b.rewardLegs) {
    if (leg.mintAddress === SOL_MINT) {
      sol += Number(leg.amountAtomic) / 10 ** leg.decimalsSnapshot;
    }
  }
  return sol;
}
```
Для USD бери `b.rewardTotalUsd` (GO уже оценил по ценам на момент `rewardPricedAt`). Награды бывают **в SOL И в pump-токенах одновременно** — не предполагай, что всегда SOL.

`rewardVaultAddress` в каждой ноге — это **Squads-vault**, который физически держит награду (мост к on-chain).

---

## 2. Как это мирорится в БД (индексер)

Не дёргай API на каждый запрос — есть индексер, который зеркалит всё в Postgres (Neon).

[`apps/indexer/src/index.ts`](apps/indexer/src/index.ts) — поллит **все 4 фазы** каждые `INDEXER_POLL_MS` (дефолт 30с) и делает `upsert` в таблицу `Bounty` по `taskId`. Логика маппинга `GoBounty → Bounty` — там же ([`upsertBounty`](apps/indexer/src/index.ts#L21)).

Запуск:
```bash
pnpm --filter @agents-go/indexer once    # разовая синхронизация
pnpm --filter @agents-go/indexer dev      # постоянный поллинг
```
Нужен `DATABASE_URL` (Neon) в `.env`. Indexer тянет env через `tsx --env-file=../../.env`.

Схема таблицы `Bounty` — [schema.prisma](packages/db/prisma/schema.prisma). После индексации читай из БД через Prisma, а не из API:
```ts
import { prisma } from "@agents-go/db";
const live = await prisma.bounty.findMany({
  where: { status: { in: ["PENDING_RESOLUTION", "IN_DISPUTE_PERIOD"] } },
  orderBy: [{ rewardTotalUsd: "desc" }, { rewardSol: "desc" }],
});
```
`criteria`, `rewardLegs`, `attachments` лежат как JSON — при чтении кастуй (`b.criteria as BountyCriterion[]`).

---

## 3. Готовые скрипты-анализаторы (примеры паттернов)

В [`apps/indexer/scripts/`](apps/indexer/scripts/) уже есть рабочие примеры — копируй их подход:

- [`check.ts`](apps/indexer/scripts/check.ts) — счётчики: total, разбивка по статусам, топ-5 по награде. Хороший «sanity check» что индексер отработал.
- [`find-doable.ts`](apps/indexer/scripts/find-doable.ts) — фильтр «что LLM реально может выполнить»: regex-эвристика, отсекающая физические/IRL/видео задания (`marathon|interview|video|tattoo…`) и оставляющая текстовые (`write|thread|code|meme|analy…`).
- [`find-text.ts`](apps/indexer/scripts/find-text.ts) — ещё строже: только чисто-текстовые делайвераблы без пруфа, плюс помечает баунти с требованием «no AI / original work» (⚠️ их агенту брать рискованно).

Запуск любого: `pnpm --filter @agents-go/indexer exec tsx scripts/<name>.ts` (после `once`).

**Важный паттерн отбора** (из этих скриптов): прежде чем агент берёт баунти, прогоняй `title + bodyMarkdown` через два фильтра — «требует физического пруфа?» (skip) и «текстовый делайвербл?» (take). И проверяй `criteria[].text` на «no AI».

---

## 4. On-chain слой (выплаты) — задел, ещё не реализован

Off-chain API НЕ говорит, заплатили ли по баунти. Это видно только on-chain. Это **фаза 2**, папка [`apps/agent/src/go/`](apps/agent/src/) пока пустая.

Факты для реализации (константы в [go-types.ts](packages/shared/src/go-types.ts#L106)):
- GO = надстройка над **Squads Protocol v4** (`SQUADS_PROGRAM_ID = SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`). Каждый баунти = Squads-vault (адрес в `rewardLegs[].rewardVaultAddress`).
- Программа GO: `GO_PROGRAM_ID = goGzNYTYkSEe4hUqz6dPmY5uf3CTt36AQAoujXDrKiV`.
- Она эмитит событие **`RecordDecision`** (discriminator `5a4e4983f2c3178e`): vault pubkey + submitter pubkey + u64 ts + статус-байт (принято/отклонено). Это **источник истины по выплатам**.
- `PaySubmissionFee` — сабмиттер платит фикс-комиссию при отправке (суммы в `chainConfigSnapshot.submissionFeeLamports`).

**Как трекать выплаты** (паттерн): подписаться через Triton Yellowstone gRPC на транзакции `GO_PROGRAM_ID`, парсить лог `RecordDecision`, матчить vault → баунти → claim, писать в таблицу `Payout`. Полный рецепт стриминга/парсинга pump.fun-транзакций — в скилле **`grpc-watcher`** (env: `TRITON_GRPC_ENDPOINT`, `TRITON_GRPC_TOKEN`). Используй его, не изобретай свой парсер свапов.

**Стена честности:** приёмка сабмишенов у GO **ручная у pump.fun** — `RecordDecision` подписывает их ключ. Полностью автономный цикл «нашёл → выполнил → забрал» невозможен: между выполнением и выплатой стоит их модератор. Это отражаем честно, не фейкаем.

---

## TL;DR для агента
1. Читать баунти → [`GoClient.tasks({ phase: ["PENDING_RESOLUTION","IN_DISPUTE_PERIOD"], limit: 100 })`](packages/shared/src/go-client.ts). Не `OPEN`.
2. Награды → массив `rewardLegs`, дели `amountAtomic / 10**decimalsSnapshot`; SOL через [`bountyRewardSol`](packages/shared/src/go-client.ts#L76), USD через `rewardTotalUsd`.
3. Зеркалить → [индексер](apps/indexer/src/index.ts) в Neon, потом читать из Prisma.
4. Отбирать выполнимое → паттерн из [`find-doable.ts`](apps/indexer/scripts/find-doable.ts) / [`find-text.ts`](apps/indexer/scripts/find-text.ts), проверять «no AI» в критериях.
5. Выплаты → on-chain `RecordDecision` от `goGzNY…KiV`, скилл `grpc-watcher`. Ещё не реализовано.
