import { assert, describe, it } from "@effect/vitest"
import { highlight } from "./highlight.ts"

describe("code highlighting at build time", () => {
  it("escapes markup so code shows as text", () => {
    assert.include(highlight("const a = x < y", "ts"), "&lt;")
    assert.notInclude(highlight("<script>", "ts"), "<script>")
  })

  it("colours keywords, strings, types and calls in TypeScript", () => {
    const html = highlight('import { Effect } from "effect"\nrun()', "ts")
    assert.include(html, '<span class="tok-keyword">import</span>')
    assert.include(html, '<span class="tok-string">"effect"</span>')
    assert.include(html, '<span class="tok-type">Effect</span>')
    assert.include(html, '<span class="tok-call">run</span>')
  })

  it("colours commands and comments in shell", () => {
    const html = highlight("docker run --rm\n# then open it", "sh")
    assert.include(html, '<span class="tok-call">docker</span>')
    assert.include(html, '<span class="tok-note"># then open it</span>')
  })
})
