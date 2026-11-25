import { BunServices } from "@effect/platform-bun"
import { assert, layer } from "@effect/vitest"
import { Effect, FileSystem, Path, String as Str } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import { main, offendingLines } from "./Attribution.ts"

const guardFiles = new Set(["tooling/hooks/src/Attribution.ts", "tooling/hooks/src/Attribution.test.ts"])

const git = Effect.fnUntraced(function* (args: ReadonlyArray<string>) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

  return yield* spawner.string(ChildProcess.make("git", ["-C", "../..", ...args]))
})

const trackedText = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const listed = yield* git(["ls-files", "--stage"])
  const files = Str.split(listed, "\n")
    .filter((line) => line.length > 0)
    .filter((line) => !Str.startsWith("160000 ")(line))
    .map((line) => Str.split(line, "\t")[1] ?? "")
    .filter((file) => file.length > 0)
    .filter((file) => !guardFiles.has(file))

  const present = yield* Effect.filter(files, (file) => fs.exists(`../../${file}`), { concurrency: 16 })

  return yield* Effect.forEach(present, (file) => fs.readFileString(`../../${file}`), { concurrency: 16 })
})

const messageFile = Effect.fn("messageFile")(function* (text: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const directory = yield* fs.makeTempDirectoryScoped()
  const file = path.join(directory, "COMMIT_EDITMSG")
  yield* fs.writeFileString(file, text)

  return file
})

layer(BunServices.layer)("AI attribution guard", (it) => {
  it.effect("flags attribution trailers, footers and session links", () =>
    Effect.sync(() => {
      const message = [
        "Add a device",
        "",
        "Co-Authored-By: Claude <noreply@anthropic.com>",
        "Generated with Claude Code",
        "Claude-Session: https://claude.ai/code/session_x"
      ].join("\n")

      assert.deepStrictEqual(offendingLines(message), Str.split(message, "\n").slice(2))
    })
  )

  it.effect("leaves ordinary messages alone", () =>
    Effect.sync(() => {
      assert.deepStrictEqual(offendingLines("Co-authored-by: Ada Lovelace <ada@example.com>\nGenerated migrations"), [])
    })
  )

  it.effect("no tracked file carries attribution", () =>
    Effect.gen(function* () {
      const texts = yield* trackedText

      assert.deepStrictEqual(texts.flatMap(offendingLines), [])
    })
  )

  it.effect("no commit message in history carries attribution", () =>
    Effect.gen(function* () {
      const history = yield* git(["log", "--format=%B"])

      assert.deepStrictEqual(offendingLines(history), [])
    })
  )

  it.effect("the hook accepts an ordinary message and rejects one with an AI trailer", () =>
    Effect.gen(function* () {
      const clean = yield* messageFile("Add a device\n")
      const tainted = yield* messageFile("Add a device\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n")

      yield* main(["bun", "hook", clean])
      const error = yield* main(["bun", "hook", tainted]).pipe(Effect.flip)

      assert.strictEqual(error._tag, "AttributionFound")
      assert.include(error.message, "Co-Authored-By: Claude")
    })
  )

  it.effect("the hook explains a missing argument and an unreadable file", () =>
    Effect.gen(function* () {
      const usage = yield* main(["bun", "hook"]).pipe(Effect.flip)
      const unreadable = yield* main(["bun", "hook", "/nonexistent/COMMIT_EDITMSG"]).pipe(Effect.flip)

      assert.strictEqual(usage._tag, "Usage")
      assert.include(usage.message, "<commit-message-file>")
      assert.strictEqual(unreadable._tag, "MessageUnreadable")
      assert.include(unreadable.message, "/nonexistent/COMMIT_EDITMSG")
    })
  )
})
