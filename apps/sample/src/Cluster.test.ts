import { Recording, executions, mailboxes, placement } from "@effect-workflow/reader"
import { assert, describe, it } from "@effect/vitest"
import { Option, Schema } from "effect"
import recorded from "./fixtures/recording.json"

const recording = Option.getOrElse(Schema.decodeOption(Recording)(recorded), () => ({
  storage: { messages: [], replies: [] },
  now: 0
}))

const boxes = mailboxes(recording.storage, recording.now)

const box = (entityType: string) => {
  const found = boxes.find((candidate) => candidate.entityType === entityType)
  if (found === undefined) return assert.fail(`no mailbox for ${entityType}`)

  return found
}

describe("mailboxes, replayed 20 minutes after the recording stopped", () => {
  it("has one mailbox per entity type, with the past-due ones first", () => {
    assert.deepStrictEqual(boxes.map((mailbox) => mailbox.entityType).toSorted(), [
      "Warehouse",
      "Workflow/-/DurableClock",
      "Workflow/ApproveRefund",
      "Workflow/DailyReport",
      "Workflow/PlaceOrder",
      "Workflow/Reconcile"
    ])
    assert.strictEqual(boxes[0]?.entityType, "Workflow/-/DurableClock")
  })

  it("the durable clock nobody fired is unprocessed and past due", () => {
    const clocks = box("Workflow/-/DurableClock")
    assert.strictEqual(clocks.unprocessed, 1)
    assert.strictEqual(clocks.overdue, 1)
    assert.isTrue((clocks.oldestOverdueAt ?? recording.now) < recording.now)
  })

  it("counts messages, entities and shards per entity type", () => {
    const orders = box("Workflow/PlaceOrder")
    assert.strictEqual(orders.entities, 4)
    assert.strictEqual(orders.overdue, 0)
    assert.isTrue(orders.shards >= 1)
    assert.strictEqual(
      boxes.reduce((total, mailbox) => total + mailbox.messages, 0),
      recording.storage.messages.length
    )
  })

  it("nothing is past due when the replay is the moment the recording stopped", () => {
    const last = Math.max(...recording.storage.messages.map((message) => message.deliverAt ?? 0))
    const early = mailboxes(recording.storage, last - 120_000)
    assert.isTrue(early.every((mailbox) => mailbox.overdue === 0))
  })
})

describe("runners and shards", () => {
  it("a SingleRunner cluster stores no runners, so no shard is reported unowned", () => {
    assert.deepStrictEqual(placement(recording.storage, recording.now), { runners: [], unowned: [], ownership: "none" })
  })

  it("a runner whose heartbeat stopped is silent even while storage still says healthy", () => {
    const now = Date.UTC(2026, 10, 25, 6, 0, 0)
    const storage = {
      ...recording.storage,
      runners: [
        { address: "a:1", healthy: true, lastHeartbeat: "2026-11-25 05:59:40.1" },
        { address: "b:1", healthy: true, lastHeartbeat: "2026-11-25 05:55:00" },
        { address: "c:1", healthy: false, lastHeartbeat: "2026-11-25 05:59:50" }
      ]
    }
    assert.deepStrictEqual(
      placement(storage, now).runners.map((runner) => [runner.address, runner.state]),
      [
        ["a:1", "live"],
        ["b:1", "silent"],
        ["c:1", "unhealthy"]
      ]
    )
    assert.strictEqual(placement(storage, now).ownership, "unknown")
  })

  it("with runners, each holds its locked shards and shards nobody holds are named", () => {
    const shards = [
      ...new Set(recording.storage.messages.flatMap((message) => (message.shardId ? [message.shardId] : [])))
    ]
    const [held, ...rest] = shards.toSorted()
    const storage = {
      ...recording.storage,
      runners: [
        { address: "runner-a:34431", healthy: true, lastHeartbeat: "2026-11-25 00:20:00" },
        { address: "runner-b:34431", healthy: false, lastHeartbeat: "2026-11-25 00:01:00" }
      ],
      locks: held === undefined ? [] : [{ shardId: held, address: "runner-a:34431", acquiredAt: "2026-11-25 00:00:00" }]
    }
    const found = placement(storage, recording.now)
    assert.deepStrictEqual(
      found.runners.map((runner) => [runner.address, runner.shards]),
      [
        ["runner-a:34431", 1],
        ["runner-b:34431", 0]
      ]
    )
    assert.deepStrictEqual(found.unowned, rest.toSorted())
  })
})

describe("trace ids", () => {
  it("every run carries the trace id stored with its run message", () => {
    assert.isTrue(executions(recording.storage).every((run) => /^[0-9a-f]{32}$/.test(run.traceId ?? "")))
  })
})
