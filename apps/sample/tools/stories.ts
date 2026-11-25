import { Recording, executions } from "@effect-workflow/reader"
import { BunRuntime, BunServices } from "@effect/platform-bun"
import { Effect, FileSystem, Schema } from "effect"
import { workflows } from "../src/Api.ts"

const fixture = "src/fixtures/recording.json"

const target = "../../packages/ui/src/stories/sample.ts"

const stories = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const text = yield* fs.readFileString(fixture)
  const recording = yield* Schema.decodeEffect(Schema.fromJsonString(Recording))(text)
  const runs = executions(recording.storage, { workflows })
  const body = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(runs)
  yield* fs.writeFileString(
    target,
    [
      'import type { Execution } from "../workflow/model.ts"',
      "",
      `export const sampleCapturedAt = ${recording.now}`,
      "",
      `export const sampleRuns: ReadonlyArray<Execution> = ${body}`,
      ""
    ].join("\n")
  )
  yield* Effect.log(`wrote ${runs.length} executions from the sample recording to ${target}`)
})

BunRuntime.runMain(stories.pipe(Effect.provide(BunServices.layer)))
