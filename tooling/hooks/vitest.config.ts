import { resolve } from "node:path"
import { defineConfig } from "vitest/config"
import { coverageWarning } from "../lint/coverage.ts"

const bar = { lines: 100, branches: 100, functions: 100, statements: 100 }

export default defineConfig({
  test: {
    name: "hooks",
    include: ["src/**/*.test.ts"],
    reporters: [
      "default",
      coverageWarning(bar, { root: resolve(import.meta.dirname, "../.."), inCi: process.env["CI"] === "true" })
    ],
    coverage: {
      enabled: true,
      provider: "istanbul",
      include: ["src/**"],
      exclude: ["**/*.test.ts"],
      reporter: ["text-summary", "json-summary"]
    }
  }
})
