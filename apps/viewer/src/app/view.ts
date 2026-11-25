import { type Recording, attention, executions, mailboxes, placement } from "@effect-workflow/reader"
import { Banner, EmptyState, type Execution, Shell } from "@effect-workflow/ui"
import { String as Str } from "effect"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import { AttentionPage } from "../pages/Attention.ts"
import { ClusterPage } from "../pages/Cluster.ts"
import { RunPage } from "../pages/Run.ts"
import { RunsPage } from "../pages/Runs.ts"
import { Message } from "./Message.ts"
import type { Model, Page } from "./Model.ts"
import { type Mode } from "./Mode.ts"
import { attentionHref, clusterHref, runHref, runsHref } from "./Routes.ts"

const open = (id: string): Message => Message.RequestedPage({ href: runHref(id) })

const filled = (template: string, traceId: string, spanId: string): string =>
  Str.replaceAll("{spanId}", spanId)(Str.replaceAll("{traceId}", traceId)(template))

const traceLink = (recording: Recording, run: Execution | undefined): string | undefined => {
  if (recording.traceUrl === undefined) return undefined
  if (run?.traceId === undefined) return undefined

  return filled(recording.traceUrl, run.traceId, "")
}

const stepLink = (recording: Recording, run: Execution | undefined, selected: string): string | undefined => {
  if (recording.traceUrl === undefined) return undefined
  const span = run?.groups.find((group) => group.id === selected)?.attempts.at(-1)?.span
  if (span === undefined) return undefined

  return filled(recording.traceUrl, span.traceId, span.spanId)
}

const runPage = (
  h: HtmlBuilder<Message>,
  model: Model,
  recording: Recording,
  runs: ReadonlyArray<Execution>,
  id: string
) => {
  const run = runs.find((candidate) => candidate.id === id)
  const trace = traceLink(recording, run)
  const step = stepLink(recording, run, model.selected)

  return RunPage(h, {
    run,
    id,
    now: recording.now,
    selected: model.selected,
    view: model.view,
    backHref: runsHref,
    ...(trace === undefined ? {} : { traceHref: trace }),
    ...(step === undefined ? {} : { stepSpanHref: step }),
    onSelect: (group) => Message.SelectedStep({ id: group }),
    onView: (view) => Message.ChangedHistoryView({ view }),
    onCopy: Message.Copied()
  })
}

const loaded = (h: HtmlBuilder<Message>, model: Model, mode: Mode, recording: Recording): Html => {
  const runs: ReadonlyArray<Execution> = executions(recording.storage, { workflows: mode.workflows })
  const now = recording.now
  const page = model.page

  if (page._tag === "Attention")
    return AttentionPage(h, {
      items: attention(runs, recording.storage, now),
      finished: runs.filter((run) => run.status === "done").length,
      now,
      open
    })
  if (page._tag === "Runs")
    return RunsPage(h, {
      runs,
      now,
      filter: model.filter,
      workflow: model.workflow,
      query: model.query,
      open,
      onFilter: (filter) => Message.ChangedFilter({ filter }),
      onWorkflow: (workflow) => Message.ChangedWorkflow({ workflow }),
      onQuery: (query) => Message.ChangedQuery({ query }),
      onSince: Message.Copied()
    })
  if (page._tag === "Cluster")
    return ClusterPage(h, {
      mailboxes: mailboxes(recording.storage, now),
      placement: placement(recording.storage, now),
      now
    })
  if (page._tag === "Run") return runPage(h, model, recording, runs, page.id)

  return EmptyState(h, { text: `Nothing lives at ${page.path}.` })
}

const body = (h: HtmlBuilder<Message>, model: Model, mode: Mode): Html => {
  if (model.data._tag === "Loading") return EmptyState(h, { text: "Reading the cluster's storage…" })
  if (model.data._tag === "Unreadable")
    return Banner(h, { tone: "alarm", title: "Could not read the cluster", text: model.data.message })

  return loaded(h, model, mode, model.data.recording)
}

const titles: Readonly<Record<Exclude<Page["_tag"], "Run" | "Missing">, string>> = {
  Attention: "Needs attention",
  Runs: "Runs",
  Cluster: "Cluster"
}

const title = (page: Page): string => {
  if (page._tag === "Run") return `Run ${page.id}`
  if (page._tag === "Missing") return "Not found"

  return titles[page._tag]
}

const onRuns = (page: Page): boolean => page._tag === "Runs" || page._tag === "Run"

export const view =
  (mode: Mode) =>
  (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: `${title(model.page)} · Effect workflow viewer`,
    body: Shell(h, {
      brand: mode.brand,
      links: [
        { label: "Needs attention", href: attentionHref, current: model.page._tag === "Attention" },
        { label: "Runs", href: runsHref, current: onRuns(model.page) },
        { label: "Cluster", href: clusterHref, current: model.page._tag === "Cluster" }
      ],
      children: [body(h, model, mode)]
    })
  })
