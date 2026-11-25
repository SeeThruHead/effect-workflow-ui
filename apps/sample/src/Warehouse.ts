import { Effect, Schema, String as Str } from "effect"
import { ClusterSchema, Entity } from "effect/cluster"
import { Rpc } from "effect/rpc"
import { DurableDeferred } from "effect/workflow"

export const Shipped = DurableDeferred.make("shipped", { success: Schema.Struct({ trackingNumber: Schema.String }) })

export const Ship = Rpc.make("Ship", {
  payload: { orderId: Schema.String, token: DurableDeferred.Token },
  success: Schema.Void
}).annotate(ClusterSchema.Persisted, true)

export const Warehouse = Entity.make("Warehouse", [Ship])

const trackingNumber = (orderId: string): string => `TRK-${Str.toUpperCase(orderId)}`

export const WarehouseLayer = Warehouse.toLayer(
  Effect.succeed(
    Warehouse.of({
      Ship: ({ payload }) =>
        Effect.sleep("20 seconds").pipe(
          Effect.andThen(
            DurableDeferred.succeed(Shipped, {
              token: payload.token,
              value: { trackingNumber: trackingNumber(payload.orderId) }
            })
          ),
          Effect.withSpan("Warehouse.Ship", { attributes: { orderId: payload.orderId } })
        )
    })
  ),
  { maxIdleTime: "5 minutes" }
)
