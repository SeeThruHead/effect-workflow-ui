import { BunRuntime, BunServices } from "@effect/platform-bun"
import { Effect } from "effect"
import { main } from "../src/Attribution.ts"

BunRuntime.runMain(main(Bun.argv).pipe(Effect.provide(BunServices.layer)))
