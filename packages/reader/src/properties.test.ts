import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { Snowflake } from "effect/cluster"
import { alertKey, alertsOf, deliver } from "./Alerts.ts"
import { attention } from "./Attention.ts"
import { mailboxes } from "./Cluster.ts"
import { executions, signalWait } from "./Journal.ts"
import type { MessageRow, ReplyRow, Storage } from "./Rows.ts"

const Step = Schema.Struct({
  name: Schema.Literals(["fetch", "charge", "ship", "notify"]),
  failures: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 2 })),
  recovers: Schema.Boolean
})

const RunPlan = Schema.Struct({
  workflow: Schema.Literals(["Alpha", "Beta"]),
  steps: Schema.Array(Step).check(Schema.isMaxLength(4)),
  ending: Schema.Literals(["done", "failed", "suspended", "none"]),
  sleeping: Schema.Boolean
})

type RunPlan = typeof RunPlan.Type

const Plan = Schema.Array(RunPlan).check(Schema.isMaxLength(6))

const start = Date.UTC(2026, 10, 25, 12, 0, 0)

const idAt = (time: number): string => String(BigInt(time - Snowflake.constEpochMillis) << BigInt(22))

const success = JSON.stringify({ _tag: "Success", value: { _tag: "Complete", exit: { _tag: "Success", value: {} } } })

const failure = JSON.stringify({
  _tag: "Success",
  value: { _tag: "Complete", exit: { _tag: "Failure", cause: [{ _tag: "Fail", error: { _tag: "Boom", n: 1 } }] } }
})

const suspended = JSON.stringify({ _tag: "Success", value: { _tag: "Suspended" } })

type Rows = { readonly messages: ReadonlyArray<MessageRow>; readonly replies: ReadonlyArray<ReplyRow> }

const message = (time: number, run: RunPlan, runId: string, tag: string, payload: unknown, processed: boolean) => ({
  id: idAt(time),
  requestId: idAt(time),
  entityType: `Workflow/${run.workflow}`,
  entityId: runId,
  tag,
  payload: JSON.stringify(payload),
  processed,
  deliverAt: null
})

const reply = (time: number, request: number, payload: string): ReplyRow => ({
  id: idAt(time),
  requestId: idAt(request),
  payload
})

const stepRows = (run: RunPlan, runId: string, base: number): Rows => {
  const attempts = run.steps.flatMap((step, j) =>
    Array.from({ length: step.failures + 1 }, (_, k) => ({
      name: `${step.name}-${j}`,
      attempt: k + 1,
      ok: k === step.failures && step.recovers
    }))
  )

  return {
    messages: attempts.map((attempt, i) =>
      message(base + (i + 1) * 2000, run, runId, "activity", { name: attempt.name, attempt: attempt.attempt }, true)
    ),
    replies: attempts.map((attempt, i) =>
      reply(base + (i + 1) * 2000 + 1000, base + (i + 1) * 2000, attempt.ok ? success : failure)
    )
  }
}

const endingReply = (run: RunPlan, end: number, base: number): ReadonlyArray<ReplyRow> => {
  if (run.ending === "done") return [reply(end, base, success)]
  if (run.ending === "failed") return [reply(end, base, failure)]
  if (run.ending === "suspended") return [reply(end, base, suspended)]

  return []
}

const clockRows = (run: RunPlan, runId: string, at: number): ReadonlyArray<MessageRow> =>
  run.sleeping
    ? [
        {
          id: idAt(at),
          requestId: idAt(at),
          entityType: "Workflow/-/DurableClock",
          entityId: runId,
          tag: "run",
          payload: JSON.stringify({ name: "nap", wakeUp: at + 600_000 }),
          processed: false,
          deliverAt: at + 600_000
        }
      ]
    : []

const runRows = (run: RunPlan, i: number): Rows => {
  const base = start + i * 1_000_000
  const runId = `run-${i}`
  const steps = stepRows(run, runId, base)
  const end = base + 900_000

  return {
    messages: [
      message(base, run, runId, "run", { i }, run.ending !== "none"),
      ...steps.messages,
      ...clockRows(run, runId, base + 800_000)
    ],
    replies: [...steps.replies, ...endingReply(run, end, base)]
  }
}

const storageOf = (plan: ReadonlyArray<RunPlan>): Storage => {
  const rows = plan.map(runRows)

  return { messages: rows.flatMap((row) => row.messages), replies: rows.flatMap((row) => row.replies) }
}

const expectedStatus = (run: RunPlan): string => {
  if (run.ending === "done") return "done"
  if (run.ending === "failed") return "failed"
  if (run.ending === "suspended") return "waiting"

  return run.sleeping ? "waiting" : "queued"
}

const firstUnrecovered = (run: RunPlan): number => run.steps.findIndex((step) => !step.recovers)

const later = start + 30 * 86_400_000

describe("the reader, over generated cluster storage", () => {
  it.prop("finds one run per run message, whatever order the rows come in", { plan: Plan }, ({ plan }) => {
    const storage = storageOf(plan)
    const shuffled = { messages: storage.messages.toReversed(), replies: storage.replies.toReversed() }
    assert.strictEqual(executions(storage).length, plan.length)
    assert.deepStrictEqual(executions(shuffled), executions(storage))
  })

  it.prop("each run's status follows its stored ending", { plan: Plan }, ({ plan }) => {
    const runs = executions(storageOf(plan))
    plan.forEach((run, i) =>
      assert.strictEqual(runs.find((found) => found.id === `run-${i}`)?.status, expectedStatus(run))
    )
  })

  it.prop("every attempt is kept, and every attempt but the last is retryable", { plan: Plan }, ({ plan }) => {
    const runs = executions(storageOf(plan))
    plan.forEach((run, i) =>
      run.steps.forEach((step, j) => {
        const group = runs.find((found) => found.id === `run-${i}`)?.groups.find((g) => g.name === `${step.name}-${j}`)
        assert.strictEqual(group?.attempts.length, step.failures + 1)
        assert.deepStrictEqual(
          group?.attempts.map((attempt) => attempt.n),
          Array.from({ length: step.failures + 1 }, (_, k) => k + 1)
        )
        assert.isTrue(
          (group?.attempts ?? [])
            .slice(0, -1)
            .every((attempt) => attempt.outcome._tag === "failure" && attempt.outcome.error.retryable)
        )
      })
    )
  })

  it.prop(
    "steps that start after a step failed for good are compensations, and no others",
    { plan: Plan },
    ({ plan }) => {
      const runs = executions(storageOf(plan))
      plan.forEach((run, i) => {
        const failed = firstUnrecovered(run)
        run.steps.forEach((step, j) => {
          const group = runs
            .find((found) => found.id === `run-${i}`)
            ?.groups.find((g) => g.name === `${step.name}-${j}`)
          assert.strictEqual(group?.kind === "compensation", failed !== -1 && j > failed)
        })
      })
    }
  )

  it.prop("every history is numbered from 1 and in time order", { plan: Plan }, ({ plan }) => {
    executions(storageOf(plan)).forEach((run) => {
      assert.deepStrictEqual(
        run.events.map((event) => event.n),
        run.events.map((_, i) => i + 1)
      )
      assert.isTrue(run.events.every((event, i) => i === 0 || (run.events[i - 1]?.at ?? 0) <= event.at))
    })
  })
})

describe("the needs-attention rules, over generated cluster storage", () => {
  it.prop("never lists a finished run, and lists each failed run once, as failed", { plan: Plan }, ({ plan }) => {
    const storage = storageOf(plan)
    const runs = executions(storage)
    const items = attention(runs, storage, later)
    assert.isFalse(items.some((item) => item.run.status === "done"))
    assert.deepStrictEqual(
      items
        .filter((item) => item.concern === "failed")
        .map((item) => item.run.id)
        .toSorted(),
      runs
        .filter((run) => run.status === "failed")
        .map((run) => run.id)
        .toSorted()
    )
    assert.strictEqual(new Set(items.map((item) => item.run.id)).size, items.length)
  })

  it.prop("puts failed before overdue before stuck before waiting", { plan: Plan }, ({ plan }) => {
    const storage = storageOf(plan)
    const rank = { failed: 0, overdue: 1, stuck: 2, waiting: 3 }
    const ranks = attention(executions(storage), storage, later).map((item) => rank[item.concern])
    assert.deepStrictEqual(
      ranks,
      ranks.toSorted((a, b) => a - b)
    )
  })

  it.prop("a run stuck on a signal stays stuck as time passes", { plan: Plan }, ({ plan }) => {
    const storage = storageOf(plan)
    const runs = executions(storage)
    const stuckNow = attention(runs, storage, later).filter((item) => item.concern === "stuck")
    const stuckLater = attention(runs, storage, later + 86_400_000).filter((item) => item.concern === "stuck")
    assert.isTrue(stuckNow.every((item) => stuckLater.some((other) => other.run.id === item.run.id)))
    assert.isTrue(stuckNow.every((item) => item.run.currentDetails === signalWait))
  })

  it.prop("an alert is sent once while its problem lasts", { plan: Plan }, ({ plan }) => {
    const storage = storageOf(plan)
    const alerts = alertsOf(attention(executions(storage), storage, later))
    const first = deliver(alerts, new Set())
    assert.deepStrictEqual(deliver(alerts, first.open).fresh, [])
    assert.deepStrictEqual(first.open, new Set(alerts.map(alertKey)))
  })
})

describe("mailboxes, over generated cluster storage", () => {
  it.prop("count every message once, and never more past due than unprocessed", { plan: Plan }, ({ plan }) => {
    const storage = storageOf(plan)
    const boxes = mailboxes(storage, later)
    assert.strictEqual(
      boxes.reduce((total, box) => total + box.messages, 0),
      storage.messages.length
    )
    assert.isTrue(boxes.every((box) => box.overdue <= box.unprocessed))
  })
})
