import { BunRuntime, BunServices } from "@effect/platform-bun"
import { Array as Arr, Effect, FileSystem, Option, Redacted, Schema } from "effect"
import { ClusterRepo } from "../src/ClusterRepo.ts"
import { at } from "../src/Journal.ts"
import { Recording } from "../src/Rows.ts"

const usage = "usage: bun run record <cluster.db> <out.json> [minutes after the last write to replay at]"

const [database, out, after] = Bun.argv.slice(2)

const record = Effect.gen(function* () {
  if (out === undefined) return yield* Effect.fail(usage)
  const repo = yield* ClusterRepo
  const storage = yield* repo.storage
  const last = Option.getOrElse(
    Arr.last(storage.messages.map((message) => at(message.id)).toSorted((a, b) => a - b)),
    () => 0
  )
  const recording = { storage, now: last + Number(after ?? "0") * 60_000 }
  const text = yield* Schema.encodeEffect(Schema.fromJsonString(Recording))(recording)
  const fs = yield* FileSystem.FileSystem
  yield* fs.writeFileString(out, text)
  yield* Effect.log(`recorded ${storage.messages.length} messages and ${storage.replies.length} replies to ${out}`)
})

BunRuntime.runMain(
  record.pipe(Effect.provide([ClusterRepo.fromUrl(Redacted.make(database ?? ":memory:")), BunServices.layer]))
)
