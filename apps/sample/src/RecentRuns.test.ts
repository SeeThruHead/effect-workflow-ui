import { Recording, attention, executions } from "@effect-workflow/reader"
import { ClusterRepo } from "@effect-workflow/reader/repo"
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Layer, Option, Schema } from "effect"
import { SqlClient } from "effect/sql"
import { TestClock } from "effect/testing"
import { workflows } from "./Api.ts"
import recorded from "./fixtures/recording.json"

const recording = Option.getOrElse(Schema.decodeOption(Recording)(recorded), () => ({
  storage: { messages: [], replies: [] },
  now: 0
}))

const load = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  yield* sql`CREATE TABLE cluster_messages (id INTEGER PRIMARY KEY, request_id INTEGER NOT NULL, entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL, tag TEXT, payload TEXT, processed BOOLEAN NOT NULL, deliver_at INTEGER, shard_id TEXT,
    trace_id TEXT)`
  yield* sql`CREATE TABLE cluster_replies (id INTEGER PRIMARY KEY, request_id INTEGER NOT NULL, payload TEXT NOT NULL)`
  yield* Effect.forEach(
    recording.storage.messages,
    (message) =>
      sql`INSERT INTO cluster_messages ${sql.insert({
        id: message.id,
        request_id: message.requestId,
        entity_type: message.entityType,
        entity_id: message.entityId,
        tag: message.tag,
        payload: message.payload,
        processed: message.processed ? 1 : 0,
        deliver_at: message.deliverAt,
        shard_id: message.shardId ?? null,
        trace_id: message.traceId ?? null
      })}`,
    { discard: true }
  )
  yield* Effect.forEach(
    recording.storage.replies,
    (reply) =>
      sql`INSERT INTO cluster_replies ${sql.insert({ id: reply.id, request_id: reply.requestId, payload: reply.payload })}`,
    { discard: true }
  )
})

const read = (recent: Duration.Input | undefined) =>
  Effect.gen(function* () {
    yield* load
    yield* TestClock.setTime(recording.now)
    const repo = yield* ClusterRepo

    return yield* repo.storage
  }).pipe(
    Effect.provide(
      ClusterRepo.layer(recent === undefined ? {} : { recent }).pipe(
        Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" }))
      )
    )
  )

describe("reading only recent runs from a real SQLite cluster", () => {
  it.effect("without a window, every run comes back", () =>
    Effect.gen(function* () {
      const storage = yield* read(undefined)
      assert.strictEqual(executions(storage).length, 7)
      assert.strictEqual(storage.messages.length, recording.storage.messages.length)
    })
  )

  it.effect("with a window, finished runs older than it drop out and unfinished ones stay", () =>
    Effect.gen(function* () {
      const storage = yield* read("10 minutes")
      const runs = executions(storage, { workflows })
      assert.deepStrictEqual(runs.map((run) => run.workflow).toSorted(), ["ApproveRefund", "PlaceOrder"])
      assert.isTrue(runs.every((run) => run.endedAt === null))
    })
  )

  it.effect("an unfinished run keeps its durable clock, so it is still seen as overdue", () =>
    Effect.gen(function* () {
      const storage = yield* read("10 minutes")
      const items = attention(executions(storage, { workflows }), storage, recording.now)
      assert.deepStrictEqual(items.map((item) => item.concern).toSorted(), ["overdue", "stuck"])
    })
  )

  it.effect("every reply that comes back belongs to a message that came back", () =>
    Effect.gen(function* () {
      const storage = yield* read("10 minutes")
      const asked = new Set(storage.messages.map((message) => message.requestId))
      assert.isTrue(storage.replies.every((reply) => asked.has(reply.requestId)))
      assert.isTrue(storage.replies.length < recording.storage.replies.length)
    })
  )
})
