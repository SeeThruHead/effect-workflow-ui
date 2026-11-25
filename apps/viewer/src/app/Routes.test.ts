import { assert, describe, it } from "@effect/vitest"
import { pageOfHash, runHref } from "./Routes.ts"

describe("viewer routes", () => {
  it("the empty hash and the root are the needs-attention page", () => {
    assert.deepStrictEqual(pageOfHash(""), { _tag: "Attention" })
    assert.deepStrictEqual(pageOfHash("#/"), { _tag: "Attention" })
  })

  it("a run link opens that run, whatever characters its id has", () => {
    assert.deepStrictEqual(pageOfHash(runHref("order/1003 retry")), { _tag: "Run", id: "order/1003 retry" })
  })

  it("the runs list has its own page, and anything else is missing", () => {
    assert.deepStrictEqual(pageOfHash("#/runs"), { _tag: "Runs" })
    assert.deepStrictEqual(pageOfHash("#/nope"), { _tag: "Missing", path: "/nope" })
  })
})
