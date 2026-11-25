import { describe, expect, it } from "@effect/vitest"
import { clock, duration, json } from "./format.ts"

describe("formatting a workflow's times and payloads", () => {
  it("says durations at the size that reads best", () => {
    expect([
      duration(-5),
      duration(250),
      duration(1500),
      duration(125_000),
      duration(7_380_000),
      duration(97_200_000)
    ]).toEqual(["0 ms", "250 ms", "1.5 s", "2m 5s", "2h 3m", "1d 3h"])
  })

  it("prints a time of day", () => {
    expect(clock(0)).toMatch(/^\d\d:\d\d:\d\d$/)
  })

  it("reads a payload as JSON, or nothing when it is not JSON", () => {
    expect(json(null)).toBeNull()
    expect(json("not json")).toBeNull()
    expect(json('{"a":1}')).toEqual({ a: 1 })
  })
})
