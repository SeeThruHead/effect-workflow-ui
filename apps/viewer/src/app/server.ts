import { ViewerApi, rpcPath } from "@effect-workflow/client"
import { StorageUnreadable } from "@effect-workflow/reader"
import { ClusterRepo } from "@effect-workflow/reader/repo"
import { BunHttpServer, BunRuntime, BunServices } from "@effect/platform-bun"
import { Clock, Config, Effect, Layer } from "effect"
import { HttpRouter, HttpStaticServer } from "effect/http"
import { RpcSerialization, RpcServer } from "effect/rpc"

const settings = Config.all({
  database: Config.Redacted("CLUSTER_DATABASE_URL"),
  prefix: Config.String("CLUSTER_TABLE_PREFIX").pipe(Config.withDefault("cluster")),
  port: Config.Port("PORT").pipe(Config.withDefault(4317)),
  host: Config.String("HOST").pipe(Config.withDefault("0.0.0.0")),
  root: Config.String("VIEWER_STATIC_DIR").pipe(
    Config.withDefault(new URL("../../dist/live", import.meta.url).pathname)
  )
})

const handlers = ViewerApi.toLayer(
  Effect.gen(function* () {
    const repo = yield* ClusterRepo

    return ViewerApi.of({
      ReadRecording: () =>
        Effect.all({ storage: repo.storage, now: Clock.currentTimeMillis }).pipe(
          Effect.catchTag("ClusterRepoError", (error) => Effect.fail(new StorageUnreadable({ detail: error.message })))
        )
    })
  })
)

const app = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* settings
    const rpc = RpcServer.layerHttp({ group: ViewerApi, path: rpcPath, protocol: "http" }).pipe(
      Layer.provide(handlers),
      Layer.provide(ClusterRepo.fromUrl(config.database, { prefix: config.prefix })),
      Layer.provide(RpcSerialization.layerJson)
    )
    const files = HttpStaticServer.layer({ root: config.root, spa: true })

    yield* Effect.log(`viewer on http://${config.host}:${config.port}, reading ${config.prefix}_* tables read-only`)

    return HttpRouter.serve(Layer.mergeAll(rpc, files)).pipe(
      Layer.provide(BunHttpServer.layer({ port: config.port, hostname: config.host }))
    )
  })
)

BunRuntime.runMain(Layer.launch(app.pipe(Layer.provide(BunServices.layer))))
