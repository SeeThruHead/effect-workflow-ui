import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"
import { coverageWarning } from "../../tooling/lint/coverage.ts"

const bar = { lines: 100, branches: 100, functions: 100, statements: 100 }

export default defineConfig({
  resolve: { alias: { "@stylexjs/stylex": fileURLToPath(new URL("src/testing/stylex.ts", import.meta.url)) } },
  test: {
    name: "ui",
    include: ["src/**/*.test.ts"],
    reporters: [
      "default",
      coverageWarning(bar, { root: resolve(import.meta.dirname, "../.."), inCi: process.env["CI"] === "true" })
    ],
    coverage: {
      enabled: true,
      provider: "istanbul",
      include: ["src/format.ts"],
      exclude: ["**/*.test.ts"],
      reporter: ["text-summary", "json-summary"]
    }
  }
})
