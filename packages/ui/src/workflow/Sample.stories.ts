import type { Meta, StoryObj } from "@storybook/html-vite"
import { Predicate } from "effect"
import { duration } from "../format.ts"
import { sampleCapturedAt as now, sampleRuns } from "../stories/sample.ts"
import { type Kit, story } from "../stories/harness.ts"
import type { Execution } from "./model.ts"
import { History, type HistoryView, RunHeader } from "./Run.ts"
import { type RunFilter, RunList, type RunListRow } from "./Runs.ts"
import { Timeline } from "./Timeline.ts"

const meta: Meta = { title: "Workflow/Sample cluster" }
export default meta

const summary = (run: Execution): string => {
  if (run.currentDetails !== undefined) return run.currentDetails
  if (run.failure !== undefined) return `${run.failure.tag}: ${run.failure.message}`

  return `${run.groups.length} steps done`
}

const row = (kit: Kit, run: Execution): RunListRow<ReturnType<Kit["log"]>> => {
  const took = (run.endedAt ?? now) - run.startedAt

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
    onOpen: kit.log(`open ${run.id}`)
  }
}

const filters: ReadonlyArray<RunFilter> = ["all", "running", "waiting", "done", "failed"]

const count = (filter: RunFilter): number =>
  sampleRuns.filter((run) => filter === "all" || run.status === filter).length

const list = (kit: Kit) => {
  const filter = filters.find((value) => value === kit.value("filter", "all")) ?? "all"

  return RunList(kit.h, {
    total: sampleRuns.length,
    counts: {
      all: count("all"),
      running: count("running"),
      waiting: count("waiting"),
      done: count("done"),
      failed: count("failed")
    },
    filter,
    onFilter: (value) => kit.set("filter", value),
    since: "all time",
    onSince: () => kit.log("since"),
    workflows: ["all", ...new Set(sampleRuns.map((run) => run.workflow))],
    workflow: kit.value("workflow", "all"),
    onWorkflow: (value) => kit.set("workflow", value),
    query: kit.value("query", ""),
    onQuery: (value) => kit.set("query", value),
    rows: sampleRuns.filter((run) => filter === "all" || run.status === filter).map((run) => row(kit, run)),
    now,
    loading: false
  })
}

const views: ReadonlyArray<HistoryView> = ["events", "steps", "json"]

const orderRun = (orderId: string): Execution | undefined =>
  sampleRuns.find((run) => Predicate.hasProperty(run.input, "orderId") && run.input.orderId === orderId)

const page = (kit: Kit, run: Execution | undefined) => {
  if (run === undefined)
    return kit.h.p([], ["the sample run is missing; regenerate it with bun run --cwd packages/reader stories"])
  const selected = kit.value("selected", "")

  return kit.h.div(
    [kit.h.Style({ display: "flex", flexDirection: "column", gap: "16px" })],
    [
      RunHeader(kit.h, { run, now, actions: [], onCopy: () => kit.log("copied") }),
      Timeline(kit.h, {
        groups: run.groups,
        range: { start: run.startedAt, end: run.endedAt ?? now },
        now,
        selected: selected === "" ? null : selected,
        newestFirst: false,
        onSelect: (id) => kit.set("selected", selected === id ? "" : id),
        onToggleOrder: kit.log("order"),
        onCopy: () => kit.log("copied")
      }),
      History(kit.h, {
        run,
        now,
        view: views.find((view) => view === kit.value("view", "events")) ?? "events",
        newestFirst: false,
        open: null,
        onView: (view) => kit.set("view", view),
        onToggleOrder: kit.log("order"),
        onOpen: () => kit.log("open"),
        onCopy: () => kit.log("copied")
      })
    ]
  )
}

export const AllSampleRuns: StoryObj = { render: story((kit) => list(kit)) }

export const FlakyCardRetried: StoryObj = {
  render: story((kit) => page(kit, orderRun("1002")), { selected: "activity:charge card" })
}

export const DeclinedAndCompensated: StoryObj = { render: story((kit) => page(kit, orderRun("1003"))) }

export const AsleepOnADurableClock: StoryObj = { render: story((kit) => page(kit, sampleRuns[0])) }
