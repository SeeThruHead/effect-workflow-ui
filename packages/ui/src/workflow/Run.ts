import * as stylex from "@stylexjs/stylex"
import { String } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"
import { type Action, ActionBar, ActionButton, Chip, Faint, Mono, Muted, Payload, StatusBadge } from "./Basics.ts"
import { span, stamp, time } from "./format.ts"
import type { Execution, Group, Status, WfEvent } from "./model.ts"

const styles = stylex.create({
  header: { display: "flex", flexDirection: "column", gap: "12px", fontFamily: shape.font, color: colors.ink },
  top: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  title: { fontSize: shape.textLarge, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 },
  spacer: { flexGrow: 1 },
  details: {
    backgroundColor: colors.accentSoft,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderLeftWidth: "3px",
    borderLeftColor: colors.accent,
    borderRadius: shape.radiusSmall,
    padding: "8px 12px",
    fontSize: shape.text
  },
  facts: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
    gap: 0,
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusSmall,
    overflow: "hidden"
  },
  fact: {
    backgroundColor: colors.surface,
    padding: "8px 12px",
    minWidth: 0,
    boxShadow: `1px 0 0 ${colors.line}, 0 1px 0 ${colors.line}`
  },
  factLabel: { fontSize: shape.textTiny, color: colors.inkFaint },
  factValue: {
    fontSize: shape.text,
    fontWeight: 550,
    marginTop: "2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  pair: {
    display: "grid",
    gridTemplateColumns: { default: "minmax(0, 1fr) minmax(0, 1fr)", "@media (max-width: 800px)": "minmax(0, 1fr)" },
    gap: "12px"
  },
  tabs: {
    display: "flex",
    gap: "2px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    marginBottom: "8px"
  },
  tab: {
    appearance: "none",
    fontFamily: shape.font,
    fontSize: shape.textSmall,
    fontWeight: 550,
    padding: "6px 12px",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    color: { default: colors.inkSoft, ":hover": colors.ink },
    cursor: "pointer",
    marginBottom: "-1px"
  },
  tabActive: { color: colors.ink, borderBottomColor: colors.accent },
  bar: { display: "flex", justifyContent: "flex-end", marginBottom: "6px" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: shape.font,
    fontSize: shape.textSmall,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line
  },
  th: {
    textAlign: "left",
    fontSize: shape.textTiny,
    fontWeight: 600,
    color: colors.inkFaint,
    padding: "7px 10px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line
  },
  td: {
    padding: "6px 10px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.grid,
    verticalAlign: "top"
  },
  row: { cursor: "pointer", backgroundColor: { default: "transparent", ":hover": colors.sunken } },
  bad: { backgroundColor: { default: colors.failedSoft, ":hover": colors.failedSoft } },
  open: { backgroundColor: colors.bg },
  number: {
    appearance: "none",
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    fontFamily: shape.mono,
    fontSize: shape.textSmall,
    color: colors.accent,
    cursor: "pointer"
  },
  mono: { fontFamily: shape.mono },
  kind: { fontWeight: 600 },
  kindBad: { color: colors.failed },
  kindAccepted: { color: colors.accepted },
  kindWait: { color: colors.waiting },
  kindResume: { color: colors.interrupted },
  kindGood: { color: colors.done },
  step: { fontWeight: 700, marginRight: "8px" },
  keyLabel: { fontSize: shape.textTiny, color: colors.inkFaint, marginRight: "6px" },
  keyValue: {
    fontFamily: shape.mono,
    fontSize: "12px",
    backgroundColor: colors.sunken,
    padding: "1px 6px",
    borderRadius: "3px",
    display: "inline-block",
    maxWidth: "520px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    verticalAlign: "bottom"
  },
  tree: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontFamily: shape.font,
    fontSize: shape.textSmall,
    color: colors.ink
  },
  node: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "5px 10px",
    marginLeft: "calc(var(--depth) * 26px)",
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusTiny
  }
})

const bold = <M>(h: HtmlBuilder<M>, text: string): ReadonlyArray<Html | string> =>
  String.split("**")(text).map((part, index) => (index % 2 === 1 ? h.strong([], [part]) : part))

export type RunHeaderProps<M> = {
  readonly run: Execution
  readonly now: number
  readonly actions: ReadonlyArray<Action<M>>
  readonly extraFacts?: ReadonlyArray<readonly [string, string]>
  readonly onCopy?: (text: string) => M
}

export const RunHeader = <M>(h: HtmlBuilder<M>, props: RunHeaderProps<M>): Html => {
  const run = props.run
  const end = run.endedAt ?? props.now
  const live = run.endedAt === null
  const attempts = run.groups.reduce((total, group) => total + group.attempts.length, 0)
  const retried = run.groups.filter((group) => group.attempts.length > 1).length
  const copy = props.onCopy === undefined ? {} : { onCopy: props.onCopy }
  const facts: ReadonlyArray<readonly [string, string]> = [
    ["Started", stamp(run.startedAt)],
    ["Ended", run.endedAt === null ? "still going" : stamp(run.endedAt)],
    ["Duration", span(end - run.startedAt)],
    ["Trigger", run.trigger],
    ["Steps", `${run.groups.length}, ${attempts} attempts, ${retried} retried`],
    ...(run.boot === "" ? [] : [["Running on", `boot ${run.boot}`] as const]),
    ["Events", `${run.events.length}`],
    ...(props.extraFacts ?? [])
  ]
  return h.header(sx(h, styles.header), [
    h.div(sx(h, styles.top), [
      StatusBadge(h, { status: run.status, live }),
      h.h2(sx(h, styles.title), [run.workflow]),
      Mono(h, { text: run.id }),
      ...(run.boots.length > 1
        ? [
            Chip(h, {
              text: `survived ${run.boots.length - 1} restart`,
              title: "Server processes that ran this execution"
            })
          ]
        : []),
      h.span(sx(h, styles.spacer), []),
      ActionBar(h, { actions: props.actions })
    ]),
    ...(run.currentDetails === undefined ? [] : [h.div(sx(h, styles.details), bold(h, run.currentDetails))]),
    h.div(
      sx(h, styles.facts),
      facts.map(([label, value]) =>
        h.div(sx(h, styles.fact), [
          h.div(sx(h, styles.factLabel), [label]),
          h.div([...sx(h, styles.factValue), h.Title(value)], [value])
        ])
      )
    ),
    h.div(sx(h, styles.pair), [
      Payload(h, { label: "Input", value: run.input, ...copy }),
      Payload(h, { label: "Result", value: run.result ?? (live ? "Appears when the run finishes." : null), ...copy })
    ])
  ])
}

export type HistoryView = "events" | "steps" | "json"

type Tone = "bad" | "accepted" | "wait" | "resume" | "good" | "plain"

const toneOf = (event: WfEvent): Tone => {
  if (["attempt failed", "failed", "server restarted", "interrupted"].includes(event.kind)) return "bad"
  if (event.kind === "accepted failure") return "accepted"
  if (String.startsWith("clock")(event.kind) || String.startsWith("deferred")(event.kind)) return "wait"
  if (event.kind === "resumed") return "resume"
  if (event.kind === "completed" || event.kind === "finished") return "good"
  return "plain"
}

const kindTones: Readonly<Record<Tone, (typeof styles)["kindBad"] | null>> = {
  bad: styles.kindBad,
  accepted: styles.kindAccepted,
  wait: styles.kindWait,
  resume: styles.kindResume,
  good: styles.kindGood,
  plain: null
}

export type HistoryProps<M> = {
  readonly run: Execution
  readonly now: number
  readonly view: HistoryView
  readonly newestFirst: boolean
  readonly open: number | null
  readonly onView: (view: HistoryView) => M
  readonly onToggleOrder: M
  readonly onOpen: (n: number) => M
  readonly onCopy?: (text: string) => M
}

const eventRows = <M>(h: HtmlBuilder<M>, event: WfEvent, props: HistoryProps<M>): ReadonlyArray<Html> => {
  const name = props.run.groups.find((group) => group.id === event.group)?.name
  const opened = props.open === event.n
  const bad = toneOf(event) === "bad"
  return [
    h.tr(
      [...sx(h, styles.row, bad && styles.bad), h.AriaExpanded(opened), h.OnClick(props.onOpen(event.n))],
      [
        h.td(sx(h, styles.td), [
          h.button([...sx(h, styles.number), h.Type("button"), h.AriaLabel(`Event ${event.n}`)], [`${event.n}`])
        ]),
        h.td(sx(h, styles.td, styles.mono), [time(event.at)]),
        h.td(sx(h, styles.td, styles.kind, kindTones[toneOf(event)]), [event.kind]),
        h.td(sx(h, styles.td), [
          ...(name === undefined ? [] : [h.strong(sx(h, styles.step), [name])]),
          h.span(sx(h, styles.keyLabel), [event.key.label]),
          h.span(sx(h, styles.keyValue), [event.key.value])
        ])
      ]
    ),
    ...(opened
      ? [
          h.tr(sx(h, styles.open), [
            h.td(
              [...sx(h, styles.td), h.Colspan(4)],
              [
                Payload(h, {
                  label: `Event ${event.n}: ${event.kind}`,
                  value: event.fields,
                  ...(props.onCopy === undefined ? {} : { onCopy: props.onCopy })
                })
              ]
            )
          ])
        ]
      : [])
  ]
}

const head = <M>(h: HtmlBuilder<M>, labels: ReadonlyArray<string>): Html =>
  h.thead(
    [],
    [
      h.tr(
        [],
        labels.map((label) => h.th(sx(h, styles.th), [label]))
      )
    ]
  )

const eventsView = <M>(h: HtmlBuilder<M>, props: HistoryProps<M>): ReadonlyArray<Html> => {
  const shown = props.newestFirst ? props.run.events.toReversed() : props.run.events
  return [
    h.div(sx(h, styles.bar), [
      ActionButton(h, { label: props.newestFirst ? "Newest first" : "Oldest first", onPress: props.onToggleOrder })
    ]),
    h.table(
      [...sx(h, styles.table), h.AriaLabel("Events")],
      [
        head(h, ["#", "Time", "Event", "Step and key field"]),
        h.tbody(
          [],
          shown.flatMap((event) => eventRows(h, event, props))
        )
      ]
    )
  ]
}

const lastOutcome = (group: Group): string => {
  const last = group.attempts.at(-1)?.outcome
  if (last === undefined) return group.summary ?? ""
  if (last._tag === "failure") return `${last.error.tag}: ${last.error.message}`
  if (last._tag === "interrupted") return last.by
  if (last._tag === "accepted") return last.note
  if (last._tag === "success") return JSON.stringify(last.output) ?? ""
  return "running"
}

const stepsView = <M>(h: HtmlBuilder<M>, props: HistoryProps<M>): ReadonlyArray<Html> => [
  h.table(
    [...sx(h, styles.table), h.AriaLabel("Steps")],
    [
      head(h, ["Step", "Status", "Attempts", "Took", "Last outcome"]),
      h.tbody(
        [],
        props.run.groups.map((group) =>
          h.tr(sx(h, styles.row), [
            h.td(sx(h, styles.td), [h.strong([], [group.name]), " ", Faint(h, { text: group.kind })]),
            h.td(sx(h, styles.td), [StatusBadge(h, { status: group.status, live: group.end === null })]),
            h.td(sx(h, styles.td, styles.mono), [`${group.attempts.length}`]),
            h.td(sx(h, styles.td, styles.mono), [span((group.end ?? props.now) - group.start)]),
            h.td(sx(h, styles.td), [h.span(sx(h, styles.keyValue), [lastOutcome(group)])])
          ])
        )
      )
    ]
  )
]

export const History = <M>(h: HtmlBuilder<M>, props: HistoryProps<M>): Html => {
  const views: ReadonlyArray<readonly [HistoryView, string]> = [
    ["events", `Events ${props.run.events.length}`],
    ["steps", `By step ${props.run.groups.length}`],
    ["json", "JSON"]
  ]
  return h.section(
    [h.AriaLabel("History")],
    [
      h.div(
        [...sx(h, styles.tabs), h.Role("tablist"), h.AriaLabel("History views")],
        views.map(([id, label]) =>
          h.button(
            [
              ...sx(h, styles.tab, props.view === id && styles.tabActive),
              h.Type("button"),
              h.Role("tab"),
              h.AriaSelected(props.view === id),
              h.OnClick(props.onView(id))
            ],
            [label]
          )
        )
      ),
      ...(props.view === "events" ? eventsView(h, props) : []),
      ...(props.view === "steps" ? stepsView(h, props) : []),
      ...(props.view === "json"
        ? [
            Payload(h, {
              label: "Journal",
              value: props.run.events,
              ...(props.onCopy === undefined ? {} : { onCopy: props.onCopy })
            })
          ]
        : [])
    ]
  )
}

export type RelatedRun = {
  readonly depth: number
  readonly name: string
  readonly id: string
  readonly status: Status
  readonly note: string
}

export const Relationships = <M>(h: HtmlBuilder<M>, props: { readonly runs: ReadonlyArray<RelatedRun> }): Html =>
  h.div(
    [...sx(h, styles.tree), h.Role("tree"), h.AriaLabel("Related runs")],
    props.runs.map((node) =>
      h.div(
        [...sx(h, styles.node), h.Role("treeitem"), h.Style({ "--depth": `${node.depth}` })],
        [
          Faint(h, { text: node.depth === 0 ? "●" : "└" }),
          StatusBadge(h, { status: node.status, live: node.status === "running" }),
          h.strong([], [node.name]),
          Mono(h, { text: node.id }),
          Muted(h, { text: node.note })
        ]
      )
    )
  )
