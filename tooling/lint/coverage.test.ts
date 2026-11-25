import { assert, describe, it } from "@effect/vitest"
import { vi } from "vitest"
import { coverageWarning, shortfallsOf, warningOf } from "./coverage.ts"

const full = { lines: 100, branches: 100, functions: 100, statements: 100 }

const totals = (pct: Readonly<Record<string, number>>) => ({
  lines: { pct: pct["lines"] ?? 100 },
  branches: { pct: pct["branches"] ?? 100 },
  functions: { pct: pct["functions"] ?? 100 },
  statements: { pct: pct["statements"] ?? 100 }
})

const mapOf = (files: Readonly<Record<string, unknown>>) => ({
  files: () => Object.keys(files),
  fileCoverageFor: (file: string) => ({ toSummary: () => files[file] })
})

const sample = mapOf({
  "/repo/app/src/a.ts": totals({ branches: 92.3, lines: 98 }),
  "/repo/app/src/b.ts": totals({}),
  "/repo/app/src/c.ts": "not a summary"
})

describe("shortfallsOf", () => {
  it("names each file and metric under the bar, relative to the root", () => {
    assert.deepStrictEqual(shortfallsOf(sample, full, "/repo/app"), [
      { file: "src/a.ts", metric: "lines", pct: 98, bar: 100 },
      { file: "src/a.ts", metric: "branches", pct: 92.3, bar: 100 }
    ])
  })

  it("is empty for anything that is not a coverage map", () => {
    assert.deepStrictEqual(shortfallsOf(undefined, full, "/repo"), [])
    assert.deepStrictEqual(shortfallsOf({ files: [] }, full, "/repo"), [])
    assert.deepStrictEqual(shortfallsOf({ files: () => [], fileCoverageFor: 1 }, full, "/repo"), [])
    assert.deepStrictEqual(shortfallsOf({ files: 1, fileCoverageFor: 1 }, full, "/repo"), [])
  })
})

describe("warningOf", () => {
  const shortfalls = shortfallsOf(sample, full, "/repo/app")

  it("says nothing when every file meets the bar", () => {
    assert.strictEqual(warningOf([], true), "")
  })

  it("lists each file once with its metrics and says the run did not fail", () => {
    assert.strictEqual(
      warningOf(shortfalls, false),
      "\nCoverage warning: 1 file(s) under the bar. A warning only: it does not fail the run.\n" +
        "  src/a.ts: lines 98% (bar 100%), branches 92.3% (bar 100%)\n\n"
    )
  })

  it("adds a workflow warning annotation per file in CI", () => {
    assert.include(
      warningOf(shortfalls, true),
      "::warning file=src/a.ts,title=Coverage under the bar::lines 98% (bar 100%), branches 92.3% (bar 100%)"
    )
  })
})

const collect = (coverage: unknown) => {
  const write = vi.fn<(text: string) => void>()
  coverageWarning(full, { root: "/repo/app", inCi: false, write }).onCoverage?.(coverage)

  return write.mock.calls.length
}

describe("coverageWarning", () => {
  it("writes the warning when coverage is under the bar", () => {
    assert.strictEqual(collect(sample), 1)
  })

  it("writes nothing when coverage meets the bar", () => {
    assert.strictEqual(collect(mapOf({ "/repo/app/src/b.ts": totals({}) })), 0)
  })

  it("writes to stderr by default and keeps a path outside the root whole", () => {
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true)
    coverageWarning(full, { root: "/repo/app", inCi: true }).onCoverage?.(
      mapOf({ "/elsewhere/x.ts": totals({ lines: 1 }) })
    )
    assert.include(String(stderr.mock.calls[0]?.[0]), "file=/elsewhere/x.ts")
    assert.strictEqual(stderr.mock.calls.length, 1)
    stderr.mockRestore()
  })
})
