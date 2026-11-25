import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { Card, chargeOutcome } from "./Shop.ts"

const Attempt = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 10 }))

describe("charging a card", () => {
  it.prop("a declined card is declined on every attempt", { attempt: Attempt }, ({ attempt }) => {
    assert.strictEqual(chargeOutcome("declined", attempt)._tag, "declined")
  })

  it.prop("a good card is charged on every attempt", { attempt: Attempt }, ({ attempt }) => {
    assert.strictEqual(chargeOutcome("ok", attempt)._tag, "charged")
  })

  it.prop("a flaky card times out twice, then is charged", { attempt: Attempt }, ({ attempt }) => {
    assert.strictEqual(chargeOutcome("flaky", attempt)._tag, attempt < 3 ? "timeout" : "charged")
  })

  it.prop("only a flaky card ever times out", { card: Card, attempt: Attempt }, ({ card, attempt }) => {
    assert.isTrue(chargeOutcome(card, attempt)._tag !== "timeout" || card === "flaky")
  })
})
