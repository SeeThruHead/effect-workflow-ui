import { Array as Arr, Predicate, Schema, String as Str } from "effect"
import type { Reporter } from "vitest/node"

const metrics = ["lines", "branches", "functions", "statements"] as const

export type Metric = (typeof metrics)[number]

export type Bar = Readonly<Record<Metric, number>>

export type Shortfall = { readonly file: string; readonly metric: Metric; readonly pct: number; readonly bar: number }

type FileCoverage = { readonly toSummary: () => unknown }

type CoverageMap = {
  readonly files: () => ReadonlyArray<string>
  readonly fileCoverageFor: (file: string) => FileCoverage
}

const Pct = Schema.Struct({ pct: Schema.Finite })

const Summary = Schema.Struct({ lines: Pct, branches: Pct, functions: Pct, statements: Pct })

const decodeSummary = Schema.decodeUnknownOption(Summary)

const isCoverageMap = (value: unknown): value is CoverageMap => {
  if (!Predicate.hasProperty(value, "files")) return false
  if (!Predicate.hasProperty(value, "fileCoverageFor")) return false
  if (!Predicate.isFunction(value.files)) return false

  return Predicate.isFunction(value.fileCoverageFor)
}

const relative = (root: string, file: string): string =>
  Str.startsWith(`${root}/`)(file) ? Str.slice(root.length + 1)(file) : file

const fileShortfalls = (map: CoverageMap, file: string, bar: Bar, root: string): ReadonlyArray<Shortfall> =>
  decodeSummary(map.fileCoverageFor(file).toSummary()).pipe(
    Arr.fromOption,
    Arr.flatMap((summary) =>
      metrics
        .filter((metric) => summary[metric].pct < bar[metric])
        .map((metric) => ({ file: relative(root, file), metric, pct: summary[metric].pct, bar: bar[metric] }))
    )
  )

export const shortfallsOf = (coverage: unknown, bar: Bar, root: string): ReadonlyArray<Shortfall> =>
  isCoverageMap(coverage) ? coverage.files().flatMap((file) => fileShortfalls(coverage, file, bar, root)) : []

const described = (shortfall: Shortfall): string => `${shortfall.metric} ${shortfall.pct}% (bar ${shortfall.bar}%)`

const byFile = (shortfalls: ReadonlyArray<Shortfall>): ReadonlyArray<readonly [string, ReadonlyArray<Shortfall>]> =>
  Object.entries(Arr.groupBy(shortfalls, (shortfall) => shortfall.file))

const annotation = ([file, found]: readonly [string, ReadonlyArray<Shortfall>]): string =>
  `::warning file=${file},title=Coverage under the bar::${found.map(described).join(", ")}`

export const warningOf = (shortfalls: ReadonlyArray<Shortfall>, inCi: boolean): string => {
  if (shortfalls.length === 0) return ""
  const files = byFile(shortfalls)
  const lines = files.map(([file, found]) => `  ${file}: ${found.map(described).join(", ")}`)
  const heading = `Coverage warning: ${files.length} file(s) under the bar. A warning only: it does not fail the run.`
  const annotations = inCi ? files.map(annotation) : []

  return `\n${[heading, ...lines, ...annotations].join("\n")}\n\n`
}

export type Options = {
  readonly root: string
  readonly inCi: boolean
  readonly write?: (text: string) => void
}

export const coverageWarning = (bar: Bar, options: Options): Reporter => ({
  onCoverage: (coverage) => {
    const text = warningOf(shortfallsOf(coverage, bar, options.root), options.inCi)
    if (text === "") return
    const write = options.write ?? ((output: string) => process.stderr.write(output))

    write(text)
  }
})
