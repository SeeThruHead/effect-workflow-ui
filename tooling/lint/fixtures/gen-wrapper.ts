import { Effect } from "effect"
export const wrapped = (n: number) => Effect.gen(function* () {
  const doubled = yield* Effect.succeed(n * 2)
  return yield* Effect.succeed(doubled + 1)
})
