import {
  Recording,
  alertKey,
  alertsOf,
  attention,
  deliver,
  executions,
  mailboxes,
  metricsText,
  placement
} from "@effect-workflow/reader"
import { assert, describe, it } from "@effect/vitest"
import { Array as Arr, Option, Schema, String as Str } from "effect"
import recorded from "./fixtures/recording.json"

const recording = Option.getOrElse(Schema.decodeOption(Recording)(recorded), () => ({
  storage: { messages: [], replies: [] },
  now: 0
}))

const runs = executions(recording.storage)

const items = attention(runs, recording.storage, recording.now)

const alerts = alertsOf(items)

describe("alerts from the needs-attention rules", () => {
  it("alerts on failed, overdue and stuck runs, and not on runs that are only waiting", () => {
    assert.deepStrictEqual(alerts.map((alert) => alert.concern).toSorted(), ["failed", "failed", "overdue", "stuck"])
  })

  it("a run is alerted once while its problem lasts", () => {
    const first = deliver(alerts, new Set())
    const second = deliver(alerts, first.open)
    assert.strictEqual(first.fresh.length, alerts.length)
    assert.deepStrictEqual(second.fresh, [])
  })

  it("a problem that clears and comes back is alerted again", () => {
    const first = deliver(alerts, new Set())
    const cleared = deliver([], first.open)
    const back = deliver(alerts, cleared.open)
    assert.deepStrictEqual(cleared.open, new Set())
    assert.deepStrictEqual(back.fresh.map(alertKey), alerts.map(alertKey))
  })
})

describe("Prometheus metrics", () => {
  const text = metricsText({
    runs,
    attention: items,
    mailboxes: mailboxes(recording.storage, recording.now),
    placement: placement(recording.storage, recording.now),
    now: recording.now
  })

  it("counts runs by status and attention by concern", () => {
    assert.include(text, 'effect_workflow_runs{status="failed"} 2')
    assert.include(text, 'effect_workflow_runs{status="done"} 3')
    assert.include(text, 'effect_workflow_attention{concern="stuck"} 1')
  })

  it("reports the past-due durable clock and how long it has waited", () => {
    assert.include(text, 'effect_workflow_mailbox_overdue{entity_type="Workflow/-/DurableClock"} 1')
    assert.match(text, /effect_workflow_oldest_overdue_seconds [1-9]\d*/)
  })

  it("every sample line belongs to a declared gauge", () => {
    const lines = Str.split("\n")(text)
    const declared = new Set(
      Arr.getSomes(lines.map((line) => Option.fromNullishOr(/^# TYPE (\S+) gauge$/.exec(line)?.[1])))
    )
    const used = lines
      .filter((line) => line.length > 0)
      .filter((line) => !Str.startsWith("#")(line))
      .map((line) => Str.split(/[{ ]/)(line)[0])
    assert.isTrue(used.every((name) => declared.has(name)))
  })
})
