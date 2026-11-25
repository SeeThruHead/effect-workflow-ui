import { BunRuntime, BunServices } from "@effect/platform-bun"
import { Console, Effect, Schema } from "effect"
import { ClusterRepo } from "../src/ClusterRepo.ts"
import { executions } from "../src/Journal.ts"

const usage = "usage: bun run runs <cluster.db> [execution id]"

const [database, id] = Bun.argv.slice(2)

const runs = Effect.gen(function* () {
  if (database === undefined) return yield* Effect.fail(usage)
  const repo = yield* ClusterRepo
  const storage = yield* repo.storage
  const all = executions(storage)
  const shown = id === undefined ? all : all.filter((run) => run.id === id)
  const text = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(shown)
  yield* Console.log(text)
})

BunRuntime.runMain(runs.pipe(Effect.provide([ClusterRepo.sqlite(database ?? ":memory:"), BunServices.layer])))
