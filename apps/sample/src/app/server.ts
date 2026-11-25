import * as BunCrypto from "@effect/platform-bun/BunCrypto"
import { BunRuntime, BunServices } from "@effect/platform-bun"
import { Clock, Effect, Layer, Schedule } from "effect"
import { ClusterWorkflowEngine, SingleRunner } from "effect/cluster"
import { Database } from "../platform/Database.ts"
import { ApproveRefund, type Card, DailyReport, PlaceOrder, Reconcile, ShopLayer } from "../Shop.ts"
import { WarehouseLayer } from "../Warehouse.ts"

const cards: ReadonlyArray<Card> = ["ok", "flaky", "declined"]

const cardFor = (n: number): Card => cards[n % cards.length] ?? "ok"

const seed = Effect.all(
  [
    PlaceOrder.execute({ orderId: "1001", sku: "lamp", quantity: 1, card: "ok" }, { discard: true }),
    PlaceOrder.execute({ orderId: "1002", sku: "desk", quantity: 1, card: "flaky" }, { discard: true }),
    PlaceOrder.execute({ orderId: "1003", sku: "chair", quantity: 4, card: "declined" }, { discard: true }),
    DailyReport.execute({ day: "2026-11-20" }, { discard: true }),
    Reconcile.execute({ ledger: "nightly-2026-11-20" }, { discard: true }),
    ApproveRefund.execute({ refundId: "r-77", amount: 240 }, { discard: true })
  ],
  { concurrency: "unbounded" }
)

const placeNextOrder = Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis
  const n = Math.floor(now / 1000)
  yield* PlaceOrder.execute({ orderId: String(n), sku: "mug", quantity: 2, card: cardFor(n) }, { discard: true })
})

const shop = Effect.gen(function* () {
  yield* seed
  yield* Effect.log("seeded the sample runs; a new order starts every two minutes")
  yield* Effect.repeat(Effect.delay(placeNextOrder, "2 minutes"), Schedule.forever)
})

const cluster = ClusterWorkflowEngine.layer.pipe(
  Layer.provideMerge(SingleRunner.layer({ runnerStorage: "sql" })),
  Layer.provide(Database),
  Layer.provide(BunCrypto.layer)
)

const app = Layer.effectDiscard(Effect.forkScoped(shop)).pipe(
  Layer.provideMerge(Layer.mergeAll(ShopLayer, WarehouseLayer)),
  Layer.provide(cluster),
  Layer.provide(BunServices.layer)
)

BunRuntime.runMain(Layer.launch(app))
