import { Recording, type Storage, attention, executions, mailboxes, placement } from "@effect-workflow/reader"
import { assert, describe, it } from "@effect/vitest"
import { Option, Schema, String as Str } from "effect"
import { workflows } from "./Api.ts"
import recorded from "./fixtures/recording-cluster.json"

const empty: Storage = { messages: [], replies: [], runners: [], locks: [] }

const recording = Option.getOrElse(Schema.decodeOption(Recording)(recorded), () => ({ storage: empty, now: 0 }))

const seen = placement(recording.storage, recording.now)

const runner = (port: string) => {
  const found = seen.runners.find((candidate) => Str.endsWith(`:${port}`)(candidate.address))
  if (found === undefined) return assert.fail(`no runner on port ${port}`)

  return found
}

describe("three runners on Postgres, one killed with SIGKILL a minute before the recording", () => {
  it("storage still marks every runner healthy, so the flag alone would miss the dead one", () => {
    assert.strictEqual(recording.storage.runners?.length, 3)
    assert.isTrue((recording.storage.runners ?? []).every((registered) => registered.healthy))
  })

  it("the killed runner is silent, judged by its heartbeat, and the others are live", () => {
    assert.strictEqual(runner("34432").state, "silent")
    assert.strictEqual(runner("34431").state, "live")
    assert.strictEqual(runner("34433").state, "live")
  })

  it("its shards moved to the two live runners and every shard is held", () => {
    assert.strictEqual(seen.ownership, "locks")
    assert.deepStrictEqual(
      ["34431", "34432", "34433"].map((port) => runner(port).shards),
      [6, 0, 6]
    )
    assert.deepStrictEqual(seen.unowned, [])
  })

  it("orders kept starting and moving after the kill, and nothing is past due", () => {
    const killedAt = runner("34432").heardAt ?? recording.now
    const runs = executions(recording.storage, { workflows })
    const later = runs.filter((run) => run.startedAt > killedAt)
    assert.isAtLeast(later.length, 3)
    assert.isTrue(later.every((run) => run.groups.some((group) => group.status === "done")))
    assert.isTrue(mailboxes(recording.storage, recording.now).every((mailbox) => mailbox.overdue === 0))
    assert.isFalse(attention(runs, recording.storage, recording.now).some((item) => item.concern === "overdue"))
  })
})
