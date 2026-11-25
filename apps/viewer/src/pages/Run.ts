import {
  BackLink,
  EmptyState,
  type Execution,
  FailurePanel,
  History,
  LinkButton,
  type HistoryView,
  RunHeader,
  Stack,
  Timeline
} from "@effect-workflow/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

export type RunProps<M> = {
  readonly run: Execution | undefined
  readonly id: string
  readonly now: number
  readonly selected: string
  readonly view: HistoryView
  readonly backHref: string
  readonly traceHref?: string
  readonly onSelect: (id: string) => M
  readonly onView: (view: HistoryView) => M
  readonly onCopy: M
}

const payloads = (run: Execution): string => {
  if (run.payloads === "decoded") return `decoded with ${run.workflow}'s Schemas`
  if (run.payloads === "mismatch") return `stored JSON no longer decodes with ${run.workflow}'s Schemas`

  return "JSON as stored (no Schemas registered)"
}

const page = <M>(h: HtmlBuilder<M>, run: Execution, props: RunProps<M>): ReadonlyArray<Html> => [
  BackLink(h, { label: "All runs", href: props.backHref }),
  RunHeader(h, {
    run,
    now: props.now,
    actions: [],
    extraFacts: [["Payloads", payloads(run)], ...(run.traceId === undefined ? [] : [["Trace", run.traceId] as const])],
    onCopy: () => props.onCopy
  }),
  ...(props.traceHref === undefined ? [] : [LinkButton(h, { label: "Open this run's trace", href: props.traceHref })]),
  ...(run.failure === undefined ? [] : [FailurePanel(h, { failure: run.failure, onCopy: () => props.onCopy })]),
  Timeline(h, {
    groups: run.groups,
    range: { start: run.startedAt, end: run.endedAt ?? props.now },
    now: props.now,
    selected: props.selected === "" ? null : props.selected,
    newestFirst: false,
    onSelect: props.onSelect,
    onToggleOrder: props.onCopy,
    onCopy: () => props.onCopy
  }),
  History(h, {
    run,
    now: props.now,
    view: props.view,
    newestFirst: false,
    open: null,
    onView: props.onView,
    onToggleOrder: props.onCopy,
    onOpen: () => props.onCopy,
    onCopy: () => props.onCopy
  })
]

export const RunPage = <M>(h: HtmlBuilder<M>, props: RunProps<M>): Html =>
  Stack(h, {
    gap: 16,
    children:
      props.run === undefined
        ? [
            BackLink(h, { label: "All runs", href: props.backHref }),
            EmptyState(h, { text: `No run ${props.id} in this cluster's storage.` })
          ]
        : page(h, props.run, props)
  })
