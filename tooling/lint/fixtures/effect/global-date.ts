import { Effect } from "effect"
export const stamp = Effect.sync(() => Date.now())
