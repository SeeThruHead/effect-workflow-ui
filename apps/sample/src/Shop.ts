import { Effect, Layer, Schema } from "effect"
import { Activity, DurableClock, DurableDeferred, Workflow } from "effect/workflow"
import { Shipped, Warehouse } from "./Warehouse.ts"

export const Card = Schema.Literals(["ok", "flaky", "declined"])

export type Card = typeof Card.Type

export class CardTimeout extends Schema.TaggedError<CardTimeout, { readonly brand: unique symbol }>()("CardTimeout", {
  attempt: Schema.Int
}) {
  override get message() {
    return `the card network did not answer on attempt ${this.attempt}`
  }
}

export class CardDeclined extends Schema.TaggedError<CardDeclined, { readonly brand: unique symbol }>()(
  "CardDeclined",
  { orderId: Schema.String }
) {
  override get message() {
    return `the card for order ${this.orderId} was declined`
  }
}

export class OrderFailed extends Schema.TaggedError<OrderFailed, { readonly brand: unique symbol }>()("OrderFailed", {
  orderId: Schema.String,
  reason: Schema.String
}) {
  override get message() {
    return `order ${this.orderId} failed: ${this.reason}`
  }
}

export type ChargeOutcome = { readonly _tag: "charged" } | { readonly _tag: "timeout" } | { readonly _tag: "declined" }

export const chargeOutcome = (card: Card, attempt: number): ChargeOutcome => {
  if (card === "declined") return { _tag: "declined" }
  if (card === "flaky" && attempt < 3) return { _tag: "timeout" }

  return { _tag: "charged" }
}

export const PlaceOrder = Workflow.make("PlaceOrder", {
  payload: { orderId: Schema.String, sku: Schema.String, quantity: Schema.Int, card: Card },
  success: Schema.Struct({ orderId: Schema.String, trackingNumber: Schema.String }),
  error: OrderFailed,
  idempotencyKey: (order) => order.orderId
})

type Order = typeof PlaceOrder.payloadSchema.Type

const reserveStock = (order: Order) =>
  Activity.make({
    name: "reserve stock",
    success: Schema.Struct({ reservationId: Schema.String, sku: Schema.String, quantity: Schema.Int }),
    execute: Effect.succeed({ reservationId: `res-${order.orderId}`, sku: order.sku, quantity: order.quantity })
  })

const releaseStock = (reservationId: string) =>
  Activity.make({
    name: "release stock",
    success: Schema.Struct({ released: Schema.String }),
    execute: Effect.succeed({ released: reservationId })
  })

const chargeCard = (order: Order) =>
  Activity.make({
    name: "charge card",
    success: Schema.Struct({ chargeId: Schema.String }),
    error: Schema.Union([CardTimeout, CardDeclined]),
    execute: Effect.gen(function* () {
      const attempt = yield* Activity.CurrentAttempt
      const outcome = chargeOutcome(order.card, attempt)
      if (outcome._tag === "declined") return yield* new CardDeclined({ orderId: order.orderId })
      if (outcome._tag === "timeout") return yield* new CardTimeout({ attempt })

      return { chargeId: `ch-${order.orderId}` }
    })
  }).pipe(Activity.retry({ times: 4, while: (error) => error._tag === "CardTimeout" }))

const requestShipment = (orderId: string, token: DurableDeferred.Token) =>
  Activity.make({
    name: "request shipment",
    execute: Effect.gen(function* () {
      const warehouse = yield* Warehouse.client
      yield* warehouse("main").Ship({ orderId, token }, { discard: true })
    }).pipe(Effect.orDie)
  })

export const PlaceOrderLayer = PlaceOrder.toLayer(
  Effect.fn("PlaceOrder")(function* (order) {
    yield* reserveStock(order).pipe(Workflow.withCompensation((reservation) => releaseStock(reservation.reservationId)))
    yield* chargeCard(order).pipe(
      Effect.mapError((error) => new OrderFailed({ orderId: order.orderId, reason: error.message }))
    )
    yield* DurableClock.sleep({ name: "cooling-off", duration: "90 seconds" })
    const token = yield* DurableDeferred.token(Shipped)
    yield* requestShipment(order.orderId, token)
    const shipped = yield* DurableDeferred.await(Shipped)

    return { orderId: order.orderId, trackingNumber: shipped.trackingNumber }
  })
)

export const DailyReport = Workflow.make("DailyReport", {
  payload: { day: Schema.String },
  success: Schema.Struct({ orders: Schema.Int, revenue: Schema.Finite }),
  idempotencyKey: (report) => report.day
})

const gatherOrders = (day: string) =>
  Activity.make({
    name: "gather orders",
    success: Schema.Struct({ day: Schema.String, orders: Schema.Int }),
    execute: Effect.as(Effect.sleep("2 seconds"), { day, orders: 42 })
  })

const renderReport = (orders: number) =>
  Activity.make({
    name: "render report",
    success: Schema.Struct({ orders: Schema.Int, revenue: Schema.Finite }),
    execute: Effect.as(Effect.sleep("1 second"), { orders, revenue: orders * 19.5 })
  })

export const DailyReportLayer = DailyReport.toLayer(
  Effect.fn("DailyReport")(function* (report) {
    const gathered = yield* gatherOrders(report.day)

    return yield* renderReport(gathered.orders)
  })
)

export const Reconcile = Workflow.make("Reconcile", {
  payload: { ledger: Schema.String },
  idempotencyKey: (reconcile) => reconcile.ledger
})

const loadLedger = (ledger: string) =>
  Activity.make({
    name: "load ledger",
    execute: Effect.die(new Error(`ledger ${ledger} is corrupt at line 4812`))
  })

export const ReconcileLayer = Reconcile.toLayer(Effect.fn("Reconcile")((reconcile) => loadLedger(reconcile.ledger)))

export const Approved = DurableDeferred.make("approved", { success: Schema.Struct({ by: Schema.String }) })

export const ApproveRefund = Workflow.make("ApproveRefund", {
  payload: { refundId: Schema.String, amount: Schema.Finite },
  success: Schema.Struct({ refundId: Schema.String, approvedBy: Schema.String }),
  idempotencyKey: (refund) => refund.refundId
})

const checkRefund = (refundId: string, amount: number) =>
  Activity.make({
    name: "check refund",
    success: Schema.Struct({ refundId: Schema.String, needsApproval: Schema.Boolean }),
    execute: Effect.succeed({ refundId, needsApproval: amount > 100 })
  })

export const ApproveRefundLayer = ApproveRefund.toLayer(
  Effect.fn("ApproveRefund")(function* (refund) {
    yield* checkRefund(refund.refundId, refund.amount)
    const approval = yield* DurableDeferred.await(Approved)

    return { refundId: refund.refundId, approvedBy: approval.by }
  })
)

export const ShopLayer = Layer.mergeAll(PlaceOrderLayer, DailyReportLayer, ReconcileLayer, ApproveRefundLayer)

export const workflows = [PlaceOrder, DailyReport, Reconcile, ApproveRefund]
