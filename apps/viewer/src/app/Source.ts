import { ViewerApi, rpcPath } from "@effect-workflow/client"
import { Recording, StorageUnreadable } from "@effect-workflow/reader"
import { Context, Effect, Layer, Schema } from "effect"
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http"
import { RpcClient, RpcSerialization } from "effect/rpc"

const tooSlow = (what: string) => () => Effect.fail(new StorageUnreadable({ detail: `${what} took too long` }))

export class Source extends Context.Service<Source, { readonly read: Effect.Effect<Recording, StorageUnreadable> }>()(
  "effect-workflow/viewer/Source"
) {
  static readonly recorded = (url: string) =>
    Layer.effect(
      Source,
      Effect.gen(function* () {
        const http = yield* HttpClient.HttpClient

        return Source.of({
          read: http.get(url).pipe(
            Effect.flatMap(HttpClientResponse.schemaBodyJson(Recording)),
            Effect.mapError((error) => new StorageUnreadable({ detail: error.message })),
            Effect.timeoutOrElse({ duration: "20 seconds", orElse: tooSlow("the recording") }),
            Effect.withSpan("Source.recorded")
          )
        })
      })
    ).pipe(Layer.provide(FetchHttpClient.layer))

  static readonly live = Layer.effect(
    Source,
    Effect.gen(function* () {
      const client = yield* RpcClient.make(ViewerApi)

      return Source.of({
        read: client.ReadRecording().pipe(
          Effect.catchTag("RpcClientError", (error) => Effect.fail(new StorageUnreadable({ detail: error.message }))),
          Effect.timeoutOrElse({ duration: "20 seconds", orElse: tooSlow("the server") }),
          Effect.withSpan("Source.live")
        )
      })
    })
  ).pipe(
    Layer.provide(RpcClient.layerProtocolHttp({ url: `.${rpcPath}` })),
    Layer.provide([RpcSerialization.layerJson, FetchHttpClient.layer])
  )
}

export const unreadable = (error: unknown): string =>
  Schema.is(StorageUnreadable)(error) ? error.message : "the viewer could not read the cluster's storage"
