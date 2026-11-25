import * as BunCrypto from "@effect/platform-bun/BunCrypto"
import { BunClusterSocket, BunRuntime, BunServices } from "@effect/platform-bun"
import { Clock, Config, Duration, Effect, Layer, Option, Schedule } from "effect"
import { ClusterWorkflowEngine, RunnerAddress, SingleRunner } from "effect/cluster"
import { Database } from "../platform/Database.ts"
import { ApproveRefund, type Card, DailyReport, PlaceOrder, Reconcile, ShopLayer } from "../Shop.ts"
import { WarehouseLayer } from "../Warehouse.ts"

const settings = Config.all({
  runnerPort: Config.option(Config.Port("SAMPLE_RUNNER_PORT")),
  runnerHost: Config.String("SAMPLE_RUNNER_HOST").pipe(Config.withDefault("127.0.0.1")),
  shards: Config.Int("SAMPLE_SHARDS").pipe(Config.withDefault(12)),
  seed: Config.Boolean("SAMPLE_SEED").pipe(Config.withDefault(true)),
  advisoryLocks: Config.Boolean("SAMPLE_ADVISORY_LOCKS").pipe(Config.withDefault(true)),
  orderEvery: Config.Duration("SAMPLE_ORDER_EVERY").pipe(Config.withDefault(Duration.minutes(2)))
})

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

const shop = Effect.fn("Shop.run")(function* (every: Duration.Duration) {
  yield* seed
  yield* Effect.log(`seeded the sample runs; a new order starts every ${Duration.format(every)}`)
  yield* Effect.repeat(Effect.delay(placeNextOrder, every), Schedule.forever)
})

const singleRunner = SingleRunner.layer({ runnerStorage: "sql" })

const socketRunner = (host: string, port: number, shards: number, advisoryLocks: boolean) =>
  BunClusterSocket.layer({
    storage: "sql",
    shardingConfig: {
      runnerAddress: Option.some(RunnerAddress.make(host, port)),
      runnerListenAddress: Option.some(RunnerAddress.make("0.0.0.0", port)),
      shardsPerGroup: shards,
      shardLockDisableAdvisory: !advisoryLocks
    }
  })

const app = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* settings
    const runner = Option.match(config.runnerPort, {
      onNone: () => singleRunner,
      onSome: (port) => socketRunner(config.runnerHost, port, config.shards, config.advisoryLocks)
    })
    const cluster = ClusterWorkflowEngine.layer.pipe(
      Layer.provideMerge(runner),
      Layer.provide(Database),
      Layer.provide(BunCrypto.layer)
    )
    const work = config.seed ? Layer.effectDiscard(Effect.forkScoped(shop(config.orderEvery))) : Layer.empty

    return work.pipe(Layer.provideMerge(Layer.mergeAll(ShopLayer, WarehouseLayer)), Layer.provide(cluster))
  })
)

BunRuntime.runMain(Layer.launch(app.pipe(Layer.provide(BunServices.layer))))
