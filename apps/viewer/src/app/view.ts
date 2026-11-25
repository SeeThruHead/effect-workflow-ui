import { type Recording, attention, executions } from "@effect-workflow/reader"
import { Banner, EmptyState, type Execution, Shell } from "@effect-workflow/ui"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import { AttentionPage } from "../pages/Attention.ts"
import { RunPage } from "../pages/Run.ts"
import { RunsPage } from "../pages/Runs.ts"
import { Message } from "./Message.ts"
import type { Model, Page } from "./Model.ts"
import { type Mode } from "./Mode.ts"
import { attentionHref, runHref, runsHref } from "./Routes.ts"

const open = (id: string): Message => Message.RequestedPage({ href: runHref(id) })

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
  if (page._tag === "Run")
    return RunPage(h, {
      run: runs.find((run) => run.id === page.id),
      id: page.id,
      now,
      selected: model.selected,
      view: model.view,
      backHref: runsHref,
      onSelect: (id) => Message.SelectedStep({ id }),
      onView: (view) => Message.ChangedHistoryView({ view }),
      onCopy: Message.Copied()
    })

  return EmptyState(h, { text: `Nothing lives at ${page.path}.` })
}

const body = (h: HtmlBuilder<Message>, model: Model, mode: Mode): Html => {
  if (model.data._tag === "Loading") return EmptyState(h, { text: "Reading the cluster's storage…" })
  if (model.data._tag === "Unreadable")
    return Banner(h, { tone: "alarm", title: "Could not read the cluster", text: model.data.message })

  return loaded(h, model, mode, model.data.recording)
}

const title = (page: Page): string => {
  if (page._tag === "Attention") return "Needs attention"
  if (page._tag === "Runs") return "Runs"
  if (page._tag === "Run") return `Run ${page.id}`

  return "Not found"
}

export const view =
  (mode: Mode) =>
  (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: `${title(model.page)} · Effect workflow viewer`,
    body: Shell(h, {
      brand: mode.brand,
      links: [
        { label: "Needs attention", href: attentionHref, current: model.page._tag === "Attention" },
        { label: "Runs", href: runsHref, current: model.page._tag === "Runs" || model.page._tag === "Run" }
      ],
      children: [body(h, model, mode)]
    })
  })
