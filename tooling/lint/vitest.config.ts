import { resolve } from "node:path"
import { defineConfig } from "vitest/config"
import { coverageWarning } from "./coverage.ts"

const bar = { lines: 100, branches: 100, functions: 100, statements: 100 }

export default defineConfig({
  test: {
    name: "lint",
    include: ["*.test.ts"],
    testTimeout: 60_000,
    reporters: [
      "default",
      coverageWarning(bar, { root: resolve(import.meta.dirname, "../.."), inCi: process.env["CI"] === "true" })
    ],
    coverage: {
      enabled: true,
      provider: "istanbul",
      include: ["layout.ts", "coverage.ts"],
      reporter: ["text-summary", "json-summary"]
    }
  }
})
