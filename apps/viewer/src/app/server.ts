import { ViewerApi, rpcPath } from "@effect-workflow/client"
import {
  Alert,
  StorageUnreadable,
  alertsOf,
  attention,
  deliver,
  executions,
  mailboxes,
  metricsText,
  placement
} from "@effect-workflow/reader"
import { ClusterRepo } from "@effect-workflow/reader/repo"
import { BunHttpServer, BunRuntime, BunServices } from "@effect/platform-bun"
import { Clock, Config, Duration, Effect, Layer, Option, Redacted, Ref, Schedule, Schema } from "effect"
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpRouter,
  HttpServerResponse,
  HttpStaticServer
} from "effect/http"
import { RpcSerialization, RpcServer } from "effect/rpc"

const settings = Config.all({
  database: Config.Redacted("CLUSTER_DATABASE_URL"),
  prefix: Config.String("CLUSTER_TABLE_PREFIX").pipe(Config.withDefault("cluster")),
  recentHours: Config.Number("CLUSTER_RECENT_HOURS").pipe(Config.withDefault(168)),
  traceUrl: Config.option(Config.String("VIEWER_TRACE_URL")),
  webhook: Config.option(Config.Redacted("ALERT_WEBHOOK_URL")),
  alertEvery: Config.Duration("ALERT_EVERY").pipe(Config.withDefault(Duration.minutes(1))),
  port: Config.Port("PORT").pipe(Config.withDefault(4317)),
  host: Config.String("HOST").pipe(Config.withDefault("0.0.0.0")),
  root: Config.String("VIEWER_STATIC_DIR").pipe(
    Config.withDefault(new URL("../../dist/live", import.meta.url).pathname)
  )
})

const repoOptions = (prefix: string, recentHours: number) =>
  recentHours > 0 ? { prefix, recent: Duration.hours(recentHours) } : { prefix }

const snapshot = Effect.gen(function* () {
  const repo = yield* ClusterRepo
  const storage = yield* repo.storage
  const now = yield* Clock.currentTimeMillis
  const runs = executions(storage)

  return { storage, now, runs, attention: attention(runs, storage, now) }
})

const handlers = (traceUrl: Option.Option<string>) =>
  ViewerApi.toLayer(
    Effect.gen(function* () {
      const repo = yield* ClusterRepo
      const linked = Option.match(traceUrl, { onNone: () => ({}), onSome: (url) => ({ traceUrl: url }) })

      return ViewerApi.of({
        ReadRecording: () =>
          Effect.all({ storage: repo.storage, now: Clock.currentTimeMillis }).pipe(
            Effect.map((recording) => ({ ...recording, ...linked })),
            Effect.catchTag("ClusterRepoError", (error) =>
              Effect.fail(new StorageUnreadable({ detail: error.message }))
            )
          )
      })
    })
  )

const metricsRoute = Layer.unwrap(
  Effect.gen(function* () {
    const repo = yield* ClusterRepo
    const metrics = snapshot.pipe(
      Effect.provideService(ClusterRepo, repo),
      Effect.map((seen) =>
        HttpServerResponse.text(
          `${metricsText({
            runs: seen.runs,
            attention: seen.attention,
            mailboxes: mailboxes(seen.storage, seen.now),
            placement: placement(seen.storage, seen.now),
            now: seen.now
          })}\n`,
          { contentType: "text/plain; version=0.0.4" }
        )
      ),
      Effect.catchTag("ClusterRepoError", (error) =>
        Effect.succeed(HttpServerResponse.text(`# ${error.message}\n`, { status: 503 }))
      )
    )

    return HttpRouter.add("GET", "/metrics", metrics)
  })
)

const encodeAlert = Schema.encodeEffect(Schema.fromJsonString(Alert))

const alerter = (url: string, every: Duration.Duration) =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      const http = yield* HttpClient.HttpClient
      const open = yield* Ref.make<ReadonlySet<string>>(new Set())
      const send = Effect.fn("Alerts.send")(function* (alert: Alert) {
        const body = yield* encodeAlert(alert)
        yield* http.execute(HttpClientRequest.post(url).pipe(HttpClientRequest.bodyText(body, "application/json")))
        yield* Effect.log(`alert sent: ${alert.concern} ${alert.workflow} ${alert.runId}`)
      })
      const tick = Effect.gen(function* () {
        const seen = yield* snapshot
        const sent = yield* Ref.get(open)
        const delivery = deliver(alertsOf(seen.attention), sent)
        yield* Effect.forEach(delivery.fresh, (alert) => send(alert).pipe(Effect.timeout("10 seconds")), {
          discard: true
        })
        yield* Ref.set(open, delivery.open)
      }).pipe(Effect.catch((error) => Effect.logWarning(`alerts skipped this round: ${String(error)}`)))

      yield* Effect.forkScoped(Effect.repeat(tick, Schedule.spaced(every)))
    })
  ).pipe(Layer.provide(FetchHttpClient.layer))

const app = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* settings
    const repo = ClusterRepo.fromUrl(config.database, repoOptions(config.prefix, config.recentHours))
    const rpc = RpcServer.layerHttp({ group: ViewerApi, path: rpcPath, protocol: "http" }).pipe(
      Layer.provide(handlers(config.traceUrl)),
      Layer.provide(RpcSerialization.layerJson)
    )
    const files = HttpStaticServer.layer({ root: config.root, spa: true })
    const alerts = Option.match(config.webhook, {
      onNone: () => Layer.empty,
      onSome: (url) => alerter(Redacted.value(url), config.alertEvery)
    })

    yield* Effect.log(`viewer on http://${config.host}:${config.port}, reading ${config.prefix}_* tables read-only`)

    return Layer.merge(HttpRouter.serve(Layer.mergeAll(rpc, metricsRoute, files)), alerts).pipe(
      Layer.provide(repo),
      Layer.provide(BunHttpServer.layer({ port: config.port, hostname: config.host }))
    )
  })
)

BunRuntime.runMain(Layer.launch(app.pipe(Layer.provide(BunServices.layer))))
