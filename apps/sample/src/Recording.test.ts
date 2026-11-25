import { Recording, attention, executions, signalWait, workflowNames } from "@effect-workflow/reader"
import type { Execution, Group } from "@effect-workflow/ui"
import { assert, describe, it } from "@effect/vitest"
import { Option, Predicate, Schema } from "effect"
import { PlaceOrder, workflows } from "./Api.ts"
import recorded from "./fixtures/recording.json"

const recording = Option.getOrElse(Schema.decodeOption(Recording)(recorded), () => ({
  storage: { messages: [], replies: [] },
  now: 0
}))

const runs = executions(recording.storage, { workflows })

const raw = executions(recording.storage)

const order = (orderId: string, from: ReadonlyArray<Execution> = runs): Execution => {
  const found = from.find((run) => Predicate.hasProperty(run.input, "orderId") && run.input.orderId === orderId)
  if (found === undefined) return assert.fail(`no run for order ${orderId}`)

  return found
}

const workflow = (name: string): Execution => {
  const found = runs.find((run) => run.workflow === name)
  if (found === undefined) return assert.fail(`no ${name} run`)

  return found
}

const group = (run: Execution, name: string): Group => {
  const found = run.groups.find((candidate) => candidate.name === name)
  if (found === undefined) return assert.fail(`${run.id} has no ${name} step`)

  return found
}

describe("reading a recorded cluster's storage", () => {
  it("finds every workflow run, newest first, and names the workflows", () => {
    assert.deepStrictEqual(workflowNames(recording.storage), [
      "ApproveRefund",
      "DailyReport",
      "PlaceOrder",
      "Reconcile"
    ])
    assert.strictEqual(runs.length, 7)
    assert.isTrue(runs.every((run, i) => i === 0 || (runs[i - 1]?.startedAt ?? 0) >= run.startedAt))
  })

  it("a shipped order is done, with its result, sleep and signal", () => {
    const run = order("1001")
    assert.strictEqual(run.status, "done")
    assert.deepStrictEqual(run.result, { orderId: "1001", trackingNumber: "TRK-1001" })
    assert.strictEqual(group(run, "cooling-off").kind, "clock")
    assert.strictEqual(group(run, "shipped").kind, "deferred")
  })

  it("a flaky charge shows each attempt with its error, then the success", () => {
    const charge = group(order("1002"), "charge card")
    assert.deepStrictEqual(
      charge.attempts.map((attempt) => [
        attempt.n,
        attempt.outcome._tag,
        attempt.outcome._tag === "failure" ? attempt.outcome.error.retryable : null
      ]),
      [
        [1, "failure", true],
        [2, "failure", true],
        [3, "success", null]
      ]
    )
  })

  it("a step that ran after a failure is a compensation", () => {
    const run = order("1003")
    assert.strictEqual(run.status, "failed")
    assert.strictEqual(group(run, "release stock").kind, "compensation")
    assert.strictEqual(group(run, "reserve stock").kind, "activity")
    assert.isTrue(run.events.some((event) => event.kind === "compensation done"))
  })

  it("with the app's Schemas, a domain error carries its own message", () => {
    assert.strictEqual(order("1003").failure?.message, "order 1003 failed: the card for order 1003 was declined")
    assert.strictEqual(order("1003").payloads, "decoded")
  })

  it("without Schemas, the stored fields describe the error and payloads stay raw", () => {
    assert.include(order("1003", raw).failure?.message ?? "", "was declined")
    assert.strictEqual(order("1003", raw).payloads, "raw")
  })

  it("a stored payload that no longer decodes is flagged as a mismatch", () => {
    const drifted = [
      {
        _tag: "PlaceOrder",
        payloadSchema: Schema.Struct({ orderId: Schema.Finite }),
        successSchema: PlaceOrder.successSchema,
        errorSchema: PlaceOrder.errorSchema
      }
    ]
    assert.strictEqual(order("1001", executions(recording.storage, { workflows: drifted })).payloads, "mismatch")
  })

  it("a run that dies carries the defect and its message", () => {
    const run = workflow("Reconcile")
    assert.strictEqual(run.failure?.kind, "defect")
    assert.include(run.failure?.message ?? "", "corrupt at line 4812")
  })

  it("a run waiting on a signal says so", () => {
    assert.strictEqual(workflow("ApproveRefund").currentDetails, signalWait)
  })

  it("numbers each run's history in time order from the start", () => {
    runs.forEach((run) => {
      assert.strictEqual(run.events[0]?.kind, "started")
      assert.deepStrictEqual(
        run.events.map((event) => event.n),
        run.events.map((_, i) => i + 1)
      )
      assert.isTrue(run.events.every((event, i) => i === 0 || (run.events[i - 1]?.at ?? 0) <= event.at))
    })
  })
})

describe("what needs attention, replayed 20 minutes after the recording stopped", () => {
  const items = attention(runs, recording.storage, recording.now)

  it("puts failed runs first, then overdue, then stuck", () => {
    assert.deepStrictEqual(
      items.map((item) => item.concern),
      ["failed", "failed", "overdue", "stuck"]
    )
  })

  it("a durable sleep that should have fired is overdue", () => {
    const late = items.find((item) => item.concern === "overdue")
    assert.include(late?.why ?? "", "cooling-off")
    assert.include(late?.why ?? "", "has not fired")
  })

  it("a run suspended on a signal for longer than the limit is stuck", () => {
    assert.strictEqual(items.find((item) => item.concern === "stuck")?.run.workflow, "ApproveRefund")
  })

  it("the same signal wait is only waiting while it is young", () => {
    const fresh = attention(runs, recording.storage, workflow("ApproveRefund").startedAt + 60_000)
    assert.strictEqual(fresh.find((item) => item.run.workflow === "ApproveRefund")?.concern, "waiting")
  })

  it("finished runs need nothing", () => {
    assert.isFalse(items.some((item) => item.run.status === "done"))
  })
})
