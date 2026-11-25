import { BunServices } from "@effect/platform-bun"
import { assert, layer } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"

const Report = Schema.fromJsonString(
  Schema.Struct({
    diagnostics: Schema.Array(
      Schema.Struct({
        code: Schema.String,
        filename: Schema.String,
        labels: Schema.Array(Schema.Struct({ span: Schema.Struct({ line: Schema.Int }) }))
      })
    )
  })
)

const expected = [
  "apps/romserve/src/app/Client.ts house(boundaries) 2",
  "apps/romserve/src/app/Client.ts house(boundaries) 3",
  "apps/romserve/src/app/Reach.ts house(boundaries) 1",
  "apps/romserve/src/app/Reach.ts house(boundaries) 2",
  "apps/romserve/src/client/Bundle.ts house(boundaries) 1",
  "apps/romserve/src/domains/catalog/Catalog.ts house(boundaries) 1",
  "apps/romserve/src/domains/catalog/Catalog.ts house(boundaries) 2",
  "apps/romserve/src/domains/library/Shelf.ts house(boundaries) 2",
  "apps/romserve/src/features/import/handlers.ts house(boundaries) 1",
  "casts.ts house(no-casts) 1",
  "comments.ts house(no-comments) 1",
  "effect/floating.ts effecttsgo(floating-effect) 3",
  "effect/global-date.ts effecttsgo(global-date-in-effect) 2",
  "gen-wrapper.ts house(no-gen-wrapper) 2",
  "let.ts house(no-let) 2",
  "loops.ts house(no-loops) 3",
  "loops.ts house(no-mutation) 3",
  "multiline-logical.ts house(no-multiline-logical) 2",
  "mutation.ts house(no-mutation) 2",
  "mutation.ts house(no-mutation) 3",
  "mutation.ts house(no-mutation) 4",
  "mutation.ts house(no-mutation) 6",
  "mutation.ts typescript(require-array-sort-compare) 2",
  "nested-if.ts house(no-nested-if) 3",
  "packages/framework/src/Contract.ts house(boundaries) 1",
  "packages/framework/src/Leak.ts house(boundaries) 1",
  "packages/ui/src/parts/Raw.ts house(theme-values-only) 4",
  "packages/ui/src/parts/Raw.ts house(theme-values-only) 5",
  "packages/ui/src/parts/Raw.ts house(theme-values-only) 6",
  "packages/ui/src/parts/Raw.ts house(theme-values-only) 6",
  "packages/ui/src/parts/Raw.ts house(theme-values-only) 6",
  "packages/ui/src/parts/Raw.ts house(theme-values-only) 8",
  "packages/ui/src/parts/Raw.ts house(theme-values-only) 8",
  "run.ts house(run-at-entry-only) 2",
  "suite/src/app/server.ts house(boundaries) 2",

  "transports.ts house(endpoints-in-client) 10",
  "transports.ts house(endpoints-in-client) 6",
  "transports.ts house(endpoints-in-client) 7",
  "transports.ts house(endpoints-in-client) 8",
  "transports.ts house(endpoints-in-client) 9"
]

const lintFixtures = Effect.gen(function* () {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

  return yield* spawner.string(
    ChildProcess.make("./node_modules/.bin/effect-tsgo", [
      "--tsrs-lint",
      "oxlint",
      "--type-aware",
      "--no-ignore",
      "-c",
      "fixtures.oxlintrc.json",
      "-f",
      "json",
      "fixtures"
    ])
  )
})

const located = (diagnostic: Schema.Schema.Type<typeof Report>["diagnostics"][number]): string =>
  `${diagnostic.filename.replace(/^.*fixtures\//, "")} ${diagnostic.code} ${diagnostic.labels[0]?.span.line ?? 0}`

layer(BunServices.layer)("house rules", (it) => {
  it.effect("each rule reports exactly the fixture lines it should, and clean code reports nothing", () =>
    Effect.gen(function* () {
      const output = yield* lintFixtures
      const report = yield* Schema.decodeEffect(Report)(output).pipe(
        Effect.catchTag("SchemaError", () =>
          Effect.die(
            "oxlint produced no report; run `bun install` at the repo root so @effect/tsgo can find oxlint and tsrs"
          )
        )
      )

      assert.deepStrictEqual(report.diagnostics.map(located).toSorted(), expected)
    })
  )
})
