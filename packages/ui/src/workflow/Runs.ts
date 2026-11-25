import * as stylex from "@stylexjs/stylex"
import { String } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx, sxv } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"
import { Chip, Faint, Mono, StatusBadge } from "./Basics.ts"
import { stamp, time } from "./format.ts"
import type { Status } from "./model.ts"

export type RunFilter = "all" | "running" | "waiting" | "done" | "failed"
export type RunSince = "all time" | "today" | "last hour"

export type RunListRow<M> = {
  readonly id: string
  readonly workflow: string
  readonly status: Status
  readonly live: boolean
  readonly trigger: string
  readonly startedAt: number
  readonly took: string
  readonly tookMs: number
  readonly steps: number
  readonly restarts: number
  readonly spend: string | null
  readonly now: string
  readonly onOpen: M
}

export type RunListProps<M> = {
  readonly total: number
  readonly counts: Readonly<Record<RunFilter, number>>
  readonly filter: RunFilter
  readonly onFilter: (filter: RunFilter) => M
  readonly since: RunSince
  readonly onSince: (since: RunSince) => M
  readonly workflows: ReadonlyArray<string>
  readonly workflow: string
  readonly onWorkflow: (workflow: string) => M
  readonly query: string
  readonly onQuery: (text: string) => M
  readonly rows: ReadonlyArray<RunListRow<M>>
  readonly now: number
  readonly loading: boolean
}

const styles = stylex.create({
  page: { display: "flex", flexDirection: "column", gap: "14px", fontFamily: shape.font, color: colors.ink },
  head: { display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" },
  title: { fontSize: shape.textLarge, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 },
  updated: { fontSize: shape.textTiny, color: colors.inkFaint, fontFamily: shape.mono },
  spacer: { flexGrow: 1 },
  search: {
    appearance: "none",
    width: { default: "360px", "@media (max-width: 700px)": "100%" },
    fontFamily: shape.font,
    fontSize: shape.textSmall,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: { default: colors.line, ":focus": colors.accent },
    borderRadius: shape.radiusSmall,
    padding: "7px 10px",
    outline: "none"
  },
  counts: { display: "flex", gap: "6px", flexWrap: "wrap" },
  count: {
    appearance: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    fontFamily: shape.font,
    fontSize: shape.textSmall,
    fontWeight: 600,
    padding: "5px 11px 5px 9px",
    borderRadius: shape.radiusSmall,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: { default: colors.surface, ":hover": colors.sunken },
    color: colors.inkSoft,
    cursor: "pointer"
  },
  countOn: {
    borderColor: colors.accent,
    backgroundColor: { default: colors.accentSoft, ":hover": colors.accentSoft },
    color: colors.ink
  },
  number: { fontFamily: shape.mono, fontSize: "15px", fontWeight: 700, color: colors.ink },
  dot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  dotAll: { backgroundColor: colors.inkFaint },
  dotRunning: { backgroundColor: colors.running },
  dotWaiting: { backgroundColor: colors.waiting },
  dotDone: { backgroundColor: colors.done },
  dotFailed: { backgroundColor: colors.failed },
  frame: {
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusSmall,
    overflow: "hidden"
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 8px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    flexWrap: "wrap"
  },
  quick: {
    appearance: "none",
    fontFamily: shape.font,
    fontSize: shape.textSmall,
    fontWeight: 550,
    padding: "4px 10px",
    borderRadius: shape.radiusTiny,
    borderWidth: 0,
    backgroundColor: { default: "transparent", ":hover": colors.sunken },
    color: colors.inkSoft,
    cursor: "pointer"
  },
  quickOn: { backgroundColor: { default: colors.sunken, ":hover": colors.sunken }, color: colors.ink },
  divider: { width: "1px", height: "18px", backgroundColor: colors.line, marginInline: "4px" },
  select: {
    fontFamily: shape.font,
    fontSize: shape.textSmall,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusTiny,
    padding: "3px 6px"
  },
  scroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: shape.textSmall, minWidth: "900px" },
  th: {
    textAlign: "left",
    fontSize: shape.textTiny,
    fontWeight: 600,
    color: colors.inkFaint,
    padding: "7px 12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    whiteSpace: "nowrap"
  },
  right: { textAlign: "right" },
  day: {
    padding: "6px 12px",
    fontSize: shape.textTiny,
    fontWeight: 650,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: colors.inkFaint,
    backgroundColor: colors.bg,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line
  },
  row: { cursor: "pointer", backgroundColor: { default: "transparent", ":hover": colors.hover } },
  td: {
    padding: "9px 12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.grid,
    verticalAlign: "middle"
  },
  failedEdge: { boxShadow: `inset 3px 0 0 ${colors.failed}` },
  stack: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px" },
  workflow: { fontWeight: 650 },
  id: { fontFamily: shape.mono, fontSize: shape.textTiny, color: colors.inkFaint },
  open: {
    appearance: "none",
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    fontFamily: shape.font,
    fontSize: shape.textSmall,
    fontWeight: 650,
    color: colors.ink,
    cursor: "pointer",
    textAlign: "left"
  },
  mono: { fontFamily: shape.mono, fontSize: "12px", whiteSpace: "nowrap" },
  took: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" },
  bar: {
    display: "block",
    flexShrink: 0,
    width: "54px",
    height: "4px",
    borderRadius: "2px",
    backgroundColor: colors.grid,
    overflow: "hidden"
  },
  fill: { display: "block", height: "100%", width: "var(--width)", backgroundColor: colors.inkFaint },
  fillLive: { backgroundColor: colors.running },
  now: {
    maxWidth: "min(340px, 22vw)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.inkSoft
  },
  nowFailed: { color: colors.failed },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    padding: "7px 12px",
    fontSize: shape.textTiny,
    color: colors.inkFaint
  },
  empty: { padding: "32px 12px", textAlign: "center", color: colors.inkSoft }
})

const filterDots: Readonly<Record<RunFilter, (typeof styles)["dotAll"]>> = {
  all: styles.dotAll,
  running: styles.dotRunning,
  waiting: styles.dotWaiting,
  done: styles.dotDone,
  failed: styles.dotFailed
}

const filterOrder: ReadonlyArray<RunFilter> = ["all", "running", "waiting", "done", "failed"]
const sinceOrder: ReadonlyArray<RunSince> = ["all time", "today", "last hour"]

const ago = (now: number, at: number): string => {
  const seconds = Math.max(0, Math.round((now - at) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86_400)}d ago`
}

const dayOf = (at: number): string => String.split(",")(stamp(at))[0]

const dayLabel = (now: number, at: number): string => {
  if (dayOf(at) === dayOf(now)) return `Today · ${dayOf(at)}`
  if (dayOf(at) === dayOf(now - 86_400_000)) return `Yesterday · ${dayOf(at)}`
  return dayOf(at)
}

const statusCounts = <M>(h: HtmlBuilder<M>, props: RunListProps<M>): Html =>
  h.div(
    [...sx(h, styles.counts), h.Role("group"), h.AriaLabel("Filter by status")],
    filterOrder.map((filter) =>
      h.button(
        [
          ...sx(h, styles.count, props.filter === filter && styles.countOn),
          h.Type("button"),
          h.AriaPressed(props.filter === filter ? "true" : "false"),
          h.AriaLabel(`${filter}, ${props.counts[filter]} runs`),
          h.OnClick(props.onFilter(filter))
        ],
        [
          h.span(sx(h, styles.dot, filterDots[filter]), []),
          h.span(sx(h, styles.number), [`${props.counts[filter]}`]),
          filter
        ]
      )
    )
  )

const toolbar = <M>(h: HtmlBuilder<M>, props: RunListProps<M>): Html =>
  h.div(sx(h, styles.toolbar), [
    ...sinceOrder.map((since) =>
      h.button(
        [
          ...sx(h, styles.quick, props.since === since && styles.quickOn),
          h.Type("button"),
          h.AriaPressed(props.since === since ? "true" : "false"),
          h.OnClick(props.onSince(since))
        ],
        [since]
      )
    ),
    h.span(sx(h, styles.divider), []),
    h.select(
      [...sx(h, styles.select), h.AriaLabel("Filter by workflow"), h.OnChange(props.onWorkflow)],
      props.workflows.map((name) =>
        h.option([h.Value(name), h.Selected(name === props.workflow)], [name === "all" ? "all workflows" : name])
      )
    )
  ])

const head = <M>(h: HtmlBuilder<M>): Html =>
  h.thead(
    [],
    [
      h.tr(
        [],
        [
          h.th(sx(h, styles.th), ["Status"]),
          h.th(sx(h, styles.th), ["Workflow"]),
          h.th(sx(h, styles.th), ["Trigger"]),
          h.th(sx(h, styles.th), ["Started"]),
          h.th(sx(h, styles.th, styles.right), ["Duration"]),
          h.th(sx(h, styles.th, styles.right), ["Steps"]),
          h.th(sx(h, styles.th, styles.right), ["Spend"]),
          h.th(sx(h, styles.th), ["Now, or how it ended"])
        ]
      )
    ]
  )

const runRow = <M>(h: HtmlBuilder<M>, row: RunListRow<M>, props: RunListProps<M>, longest: number): Html =>
  h.tr(
    [...sx(h, styles.row), h.OnClick(row.onOpen)],
    [
      h.td(sx(h, styles.td, row.status === "failed" && styles.failedEdge), [
        h.div(sx(h, styles.stack), [
          StatusBadge(h, { status: row.status, live: row.live }),
          ...(row.restarts > 0
            ? [
                Chip(h, {
                  text: `survived ${row.restarts} restart${row.restarts === 1 ? "" : "s"}`,
                  title: "Server processes that ran this run"
                })
              ]
            : [])
        ])
      ]),
      h.td(sx(h, styles.td), [
        h.div(sx(h, styles.stack), [
          h.button(
            [...sx(h, styles.open), h.Type("button"), h.AriaLabel(`Open ${row.workflow} ${row.id}`)],
            [row.workflow]
          ),
          h.span([...sx(h, styles.id), h.Title(row.id)], [String.slice(0, 12)(row.id)])
        ])
      ]),
      h.td(sx(h, styles.td), [Chip(h, { text: row.trigger })]),
      h.td(sx(h, styles.td), [
        h.div(
          [...sx(h, styles.stack), h.Title(stamp(row.startedAt))],
          [Mono(h, { text: time(row.startedAt) }), Faint(h, { text: ago(props.now, row.startedAt) })]
        )
      ]),
      h.td(sx(h, styles.td), [
        h.div(sx(h, styles.took), [
          h.span(sx(h, styles.mono), [row.took]),
          h.span(sx(h, styles.bar), [
            h.span(
              sxv(
                h,
                {
                  "--width": `${Math.max(4, (Math.log1p(row.tookMs) / Math.log1p(Math.max(longest, 1))) * 100).toFixed(1)}%`
                },
                styles.fill,
                row.live && styles.fillLive
              ),
              []
            )
          ])
        ])
      ]),
      h.td(sx(h, styles.td, styles.right, styles.mono), [`${row.steps}`]),
      h.td(sx(h, styles.td, styles.right, styles.mono), [row.spend ?? "·"]),
      h.td(sx(h, styles.td), [
        h.div([...sx(h, styles.now, row.status === "failed" && styles.nowFailed), h.Title(row.now)], [row.now])
      ])
    ]
  )

const bodyRows = <M>(h: HtmlBuilder<M>, props: RunListProps<M>): ReadonlyArray<Html> => {
  const longest = Math.max(...props.rows.map((row) => row.tookMs), 1)
  return props.rows.flatMap((row, index) => {
    const previous = props.rows[index - 1]
    const label = dayLabel(props.now, row.startedAt)
    const heading = previous === undefined || dayLabel(props.now, previous.startedAt) !== label
    return [
      ...(heading ? [h.tr([], [h.td([...sx(h, styles.day), h.Colspan(8)], [label])])] : []),
      runRow(h, row, props, longest)
    ]
  })
}

const listBody = <M>(h: HtmlBuilder<M>, props: RunListProps<M>): Html => {
  if (props.loading) return h.div(sx(h, styles.empty), ["Connecting…"])
  if (props.rows.length === 0) return h.div(sx(h, styles.empty), ["No runs match."])
  return h.div(sx(h, styles.scroll), [
    h.table([...sx(h, styles.table), h.AriaLabel("Runs")], [head(h), h.tbody([], bodyRows(h, props))])
  ])
}

export const RunList = <M>(h: HtmlBuilder<M>, props: RunListProps<M>): Html =>
  h.div(sx(h, styles.page), [
    h.div(sx(h, styles.head), [
      h.h1(sx(h, styles.title), [props.loading ? "Runs" : `${props.total} runs`]),
      h.span(sx(h, styles.updated), [`updated ${time(props.now)}`]),
      h.span(sx(h, styles.spacer), []),
      h.input([
        ...sx(h, styles.search),
        h.Type("search"),
        h.AriaLabel("Search runs"),
        h.Placeholder("Search by id, workflow, input or error…"),
        h.Value(props.query),
        h.OnInput(props.onQuery)
      ])
    ]),
    statusCounts(h, props),
    h.div(sx(h, styles.frame), [
      toolbar(h, props),
      listBody(h, props),
      h.div(sx(h, styles.footer), [
        h.span([], [`${props.rows.length} of ${props.total} runs`]),
        h.span([], ["Newest first"])
      ])
    ])
  ])
