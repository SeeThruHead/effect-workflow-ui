import { String as Str } from "effect"
import { type Execution, RunList, type RunListRow, duration } from "@effect-workflow/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Filter } from "../app/Model.ts"

export type RunsProps<M> = {
  readonly runs: ReadonlyArray<Execution>
  readonly now: number
  readonly filter: Filter
  readonly workflow: string
  readonly query: string
  readonly open: (id: string) => M
  readonly onFilter: (filter: Filter) => M
  readonly onWorkflow: (workflow: string) => M
  readonly onQuery: (query: string) => M
  readonly onSince: M
}

const filters: ReadonlyArray<Filter> = ["all", "running", "waiting", "done", "failed"]

const summary = (run: Execution): string => {
  if (run.currentDetails !== undefined) return run.currentDetails
  if (run.failure !== undefined) return `${run.failure.tag}: ${run.failure.message}`

  return `${run.groups.length} steps done`
}

const row = <M>(run: Execution, props: RunsProps<M>): RunListRow<M> => {
  const took = (run.endedAt ?? props.now) - run.startedAt

  return {
    id: run.id,
    workflow: run.workflow,
    status: run.status,
    live: run.endedAt === null,
    trigger: run.trigger,
    startedAt: run.startedAt,
    took: duration(took),
    tookMs: took,
    steps: run.groups.length,
    restarts: 0,
    spend: null,
    now: summary(run),
    onOpen: props.open(run.id)
  }
}

const matchesFilter =
  (filter: Filter) =>
  (run: Execution): boolean =>
    filter === "all" || run.status === filter

const matchesWorkflow =
  (workflow: string) =>
  (run: Execution): boolean =>
    workflow === "all" || run.workflow === workflow

const searchable = (run: Execution): string =>
  Str.toLowerCase(
    [run.id, run.workflow, run.currentDetails ?? "", run.failure?.message ?? "", JSON.stringify(run.input) ?? ""].join(
      " "
    )
  )

const needle = (query: string): string => Str.toLowerCase(Str.trim(query))

const matchesQuery =
  (query: string) =>
  (run: Execution): boolean =>
    needle(query) === "" || Str.includes(needle(query))(searchable(run))

export const visibleRuns = (runs: ReadonlyArray<Execution>, filter: Filter, workflow: string, query: string) =>
  runs.filter(matchesFilter(filter)).filter(matchesWorkflow(workflow)).filter(matchesQuery(query))

export const RunsPage = <M>(h: HtmlBuilder<M>, props: RunsProps<M>): Html => {
  const scoped = props.runs.filter(matchesWorkflow(props.workflow)).filter(matchesQuery(props.query))
  const counts = Object.fromEntries(filters.map((filter) => [filter, scoped.filter(matchesFilter(filter)).length]))

  return RunList(h, {
    total: props.runs.length,
    counts: {
      all: counts["all"] ?? 0,
      running: counts["running"] ?? 0,
      waiting: counts["waiting"] ?? 0,
      done: counts["done"] ?? 0,
      failed: counts["failed"] ?? 0
    },
    filter: props.filter,
    onFilter: props.onFilter,
    since: "all time",
    onSince: () => props.onSince,
    workflows: ["all", ...new Set(props.runs.map((run) => run.workflow))],
    workflow: props.workflow,
    onWorkflow: props.onWorkflow,
    query: props.query,
    onQuery: props.onQuery,
    rows: visibleRuns(props.runs, props.filter, props.workflow, props.query).map((run) => row(run, props)),
    now: props.now,
    loading: false
  })
}
