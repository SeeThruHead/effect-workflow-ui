import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx, sxv } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

export type GanttTone = "activity" | "agent" | "model" | "tool" | "wait" | "child"

export type GanttStatus = "running" | "done" | "accepted" | "failed" | "waiting"

export type GanttSegment = {
  readonly key: string
  readonly left: number
  readonly width: number
  readonly kind: "done" | "accepted" | "failed" | "interrupted" | "running" | "gap"
  readonly title: string
}

export type GanttRow<M> = {
  readonly key: string
  readonly depth: number
  readonly tone: GanttTone
  readonly status: GanttStatus
  readonly left: number
  readonly width: number
  readonly label: string
  readonly note: string
  readonly retries: number
  readonly labelLeft: boolean
  readonly labelInside?: boolean
  readonly title: string
  readonly onSelect: M
  readonly toggle?: { readonly expanded: boolean; readonly count: number; readonly onToggle: M }
  readonly detail?: ReadonlyArray<Html>
  readonly segments?: ReadonlyArray<GanttSegment>
}

export type GanttLine = { readonly key: string; readonly left: number; readonly label: string }

export type GanttBand = {
  readonly key: string
  readonly left: number
  readonly width: number
  readonly label: string
  readonly tone: "outage" | "idle"
}

export type GanttPoint = {
  readonly key: string
  readonly left: number
  readonly kind: "signal" | "timer" | "note"
  readonly label: string
  readonly title: string
}

export type GanttProps<M> = {
  readonly run: { readonly status: GanttStatus; readonly width: number; readonly label: string }
  readonly rows: ReadonlyArray<GanttRow<M>>
  readonly lines: ReadonlyArray<GanttLine>
  readonly bands: ReadonlyArray<GanttBand>
  readonly points: ReadonlyArray<GanttPoint>
  readonly startLabel: string
  readonly endLabel: string
}

const tones = {
  activity: colors.step,
  agent: colors.agent,
  model: colors.model,
  tool: colors.tool,
  wait: colors.waiting,
  child: colors.step
}

const narrow = "@media (max-width: 700px)"

const styles = stylex.create({
  frame: {
    "--gutter": { default: "280px", [narrow]: "150px" },
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radius,
    boxShadow: shape.shadow,
    overflow: "hidden"
  },
  head: {
    display: "grid",
    gridTemplateColumns: "var(--gutter) minmax(0, 1fr)",
    height: "34px",
    alignItems: "center",
    backgroundColor: colors.code,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    fontSize: "11.5px",
    color: colors.inkSoft
  },
  headGutter: {
    display: "flex",
    justifyContent: "space-between",
    paddingInline: "16px",
    fontWeight: 600,
    height: "100%",
    alignItems: "center",
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: colors.line
  },
  axis: { position: "relative", height: "100%", marginInline: "14px" },
  tick: {
    position: "absolute",
    top: "50%",
    left: "var(--left)",
    transform: "translate(-50%, -50%)",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums"
  },
  edge: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    fontFamily: shape.mono,
    fontSize: "11px",
    color: colors.ink,
    whiteSpace: "nowrap",
    backgroundColor: colors.code,
    paddingInline: "2px"
  },
  edgeStart: { left: 0 },
  edgeEnd: { right: 0 },
  body: { position: "relative" },
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "calc(var(--gutter) + 14px)",
    right: "14px",
    pointerEvents: "none"
  },
  gutterLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "var(--gutter)",
    width: "1px",
    backgroundColor: colors.line
  },
  line: { position: "absolute", top: 0, bottom: 0, left: "var(--left)", width: "1px", backgroundColor: colors.grid },
  band: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "var(--left)",
    width: "var(--width)",
    zIndex: 3,
    display: "flex",
    justifyContent: "center"
  },
  outage: {
    backgroundImage: `repeating-linear-gradient(135deg, ${colors.failedHatch} 0 5px, transparent 5px 10px)`,
    backgroundColor: colors.failedSoft,
    borderLeftWidth: "1.5px",
    borderLeftStyle: "solid",
    borderLeftColor: colors.failed,
    borderRightWidth: "1.5px",
    borderRightStyle: "solid",
    borderRightColor: colors.failed
  },
  idle: {
    backgroundImage: `repeating-linear-gradient(135deg, ${colors.sunken} 0 5px, transparent 5px 10px)`,
    borderLeftWidth: "1px",
    borderLeftStyle: "dashed",
    borderLeftColor: colors.inkFaint,
    borderRightWidth: "1px",
    borderRightStyle: "dashed",
    borderRightColor: colors.inkFaint
  },
  bandLabel: {
    position: "absolute",
    top: "10px",
    fontSize: "11px",
    fontWeight: 650,
    whiteSpace: "nowrap",
    padding: "1px 7px",
    borderRadius: "6px"
  },
  outageLabel: { color: colors.accentInk, backgroundColor: colors.failed },
  idleLabel: { color: colors.inkSoft, backgroundColor: colors.sunken },
  row: {
    position: "relative",
    zIndex: 2,
    display: "grid",
    gridTemplateColumns: "var(--gutter) minmax(0, 1fr)",
    height: "32px",
    alignItems: "center",
    cursor: "pointer",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.grid,
    backgroundColor: { default: "transparent", ":hover": colors.hover }
  },
  child: {
    height: "28px",
    backgroundColor: { default: colors.agentTint, ":hover": colors.hover }
  },
  open: { backgroundColor: colors.accentSoft },
  gutter: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
    paddingLeft: "calc(14px + var(--depth) * 22px)",
    paddingRight: "14px",
    fontSize: "13px",
    color: colors.ink
  },
  kind: { width: "8px", height: "8px", borderRadius: "2.5px", backgroundColor: "var(--tone)", flexShrink: 0 },
  kindFailed: { backgroundColor: colors.failed },
  name: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, fontWeight: 550 },
  childName: { fontWeight: 450, color: colors.inkSoft },
  took: {
    marginLeft: "auto",
    flexShrink: 0,
    fontFamily: shape.mono,
    fontSize: "11.5px",
    color: colors.inkSoft,
    fontVariantNumeric: "tabular-nums"
  },
  retry: {
    flexShrink: 0,
    fontSize: "11px",
    fontWeight: 700,
    color: colors.failed,
    backgroundColor: colors.failedSoft,
    borderRadius: "5px",
    padding: "0 5px"
  },
  toggle: {
    appearance: "none",
    flexShrink: 0,
    width: "18px",
    height: "18px",
    marginLeft: "-4px",
    display: "inline-grid",
    placeItems: "center",
    borderWidth: 0,
    borderRadius: "5px",
    backgroundColor: { default: colors.sunken, ":hover": colors.line },
    color: colors.ink,
    fontSize: "10px",
    cursor: "pointer",
    fontFamily: shape.font
  },
  count: { flexShrink: 0, fontSize: "11px", fontWeight: 600, color: colors.agent },
  plot: { position: "relative", height: "100%", marginInline: "14px" },
  bar: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    left: "var(--left)",
    width: "var(--width)",
    minWidth: "5px",
    height: "12px",
    borderRadius: "3px",
    backgroundColor: "var(--tone)",
    boxShadow: { default: "none", ":hover": `0 0 0 3px ${colors.ring}` }
  },
  thin: { height: "8px", opacity: 0.9 },
  failed: { backgroundColor: colors.failed },
  accepted: { backgroundColor: colors.accepted },
  interrupted: { backgroundColor: colors.interrupted },
  gap: {
    height: "4px",
    backgroundColor: "transparent",
    backgroundImage: `repeating-linear-gradient(90deg, ${colors.waiting} 0 4px, transparent 4px 7px)`
  },
  retried: { backgroundImage: `linear-gradient(90deg, ${colors.retrying} 0%, var(--tone) 45%)` },
  running: {
    backgroundImage: `repeating-linear-gradient(90deg, var(--tone) 0 8px, color-mix(in srgb, var(--tone) 35%, ${colors.surface}) 8px 16px)`,
    backgroundSize: "32px 12px",
    animationName: "wf-march",
    animationDuration: "0.8s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite"
  },
  dashed: {
    height: "4px",
    backgroundColor: "transparent",
    backgroundImage: "repeating-linear-gradient(90deg, var(--tone) 0 6px, transparent 6px 11px)",
    backgroundSize: "22px 4px"
  },
  pending: {
    animationName: "wf-march",
    animationDuration: "1.2s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite"
  },
  runRow: { cursor: "default", height: "38px", backgroundColor: "transparent" },
  runName: { fontWeight: 700 },
  runBar: { height: "6px", left: 0, backgroundColor: colors.done },
  runRunning: { backgroundColor: colors.running },
  runWaiting: {
    backgroundColor: "transparent",
    backgroundImage: `repeating-linear-gradient(90deg, ${colors.waiting} 0 5px, transparent 5px 9px)`
  },
  runFailed: { backgroundColor: colors.failed },
  point: {
    position: "absolute",
    top: "50%",
    left: "var(--left)",
    width: "11px",
    height: "11px",
    transform: "translate(-50%, -50%) rotate(45deg)",
    borderRadius: "2px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: colors.surface,
    zIndex: 3
  },
  signal: { backgroundColor: colors.signal },
  timer: { backgroundColor: colors.waiting },
  noteDot: { backgroundColor: colors.ink },
  pointLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "var(--left)",
    borderLeftWidth: "1px",
    borderLeftStyle: "dotted",
    zIndex: 1
  },
  signalLine: { borderLeftColor: colors.signal },
  timerLine: { borderLeftColor: colors.waiting },
  noteLine: { borderLeftColor: colors.inkFaint },
  detail: {
    position: "relative",
    zIndex: 2,
    padding: "12px 16px 14px calc(14px + var(--depth) * 22px + 16px)",
    backgroundColor: colors.code,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line
  }
})

const pct = (fraction: number) => `${(fraction * 100).toFixed(3)}%`

const barStyles = <M>(row: GanttRow<M>) => {
  if (row.tone === "wait") return [styles.dashed, row.status === "waiting" && styles.pending]
  if (row.status === "failed") return [styles.failed]
  if (row.status === "accepted") return [styles.accepted]
  if (row.status === "running") return [styles.running]
  return [row.retries > 1 && styles.retried, row.depth > 0 && styles.thin]
}

const segmentStyles = (segment: GanttSegment) => {
  if (segment.kind === "gap") return [styles.gap]
  if (segment.kind === "running") return [styles.running]
  if (segment.kind === "done") return []
  return [styles[segment.kind]]
}

const Segment = <M>(h: HtmlBuilder<M>, segment: GanttSegment): Html =>
  h.div(
    [
      ...sxv(h, { "--left": pct(segment.left), "--width": pct(segment.width) }, styles.bar, ...segmentStyles(segment)),
      h.Title(segment.title)
    ],
    []
  )

const Bars = <M>(h: HtmlBuilder<M>, row: GanttRow<M>): ReadonlyArray<Html> =>
  row.segments === undefined || row.segments.length === 0
    ? [h.div(sxv(h, { "--left": pct(row.left), "--width": pct(row.width) }, styles.bar, ...barStyles(row)), [])]
    : row.segments.map((segment) => Segment(h, segment))

const Toggle = <M>(h: HtmlBuilder<M>, toggle: NonNullable<GanttRow<M>["toggle"]>): ReadonlyArray<Html> => [
  h.button(
    [
      ...sx(h, styles.toggle),
      h.Type("button"),
      h.AriaExpanded(toggle.expanded),
      h.AriaLabel(`${toggle.expanded ? "Close" : "Open"} ${toggle.count} steps`),
      h.OnClick(toggle.onToggle)
    ],
    [toggle.expanded ? "▾" : "▸"]
  )
]

const Gutter = <M>(h: HtmlBuilder<M>, row: GanttRow<M>): Html =>
  h.div(sxv(h, { "--depth": String(row.depth) }, styles.gutter), [
    ...(row.toggle === undefined ? [] : Toggle(h, row.toggle)),
    h.span(sx(h, styles.kind, row.status === "failed" && styles.kindFailed), []),
    h.span(sx(h, styles.name, row.depth > 0 && styles.childName), [row.label]),
    ...(row.toggle === undefined ? [] : [h.span(sx(h, styles.count), [String(row.toggle.count)])]),
    ...(row.retries > 1 ? [h.span(sx(h, styles.retry), [`↻${row.retries}`])] : []),
    h.span(sx(h, styles.took), [row.note])
  ])

const Row = <M>(h: HtmlBuilder<M>, row: GanttRow<M>): ReadonlyArray<Html> => [
  h.div(
    [
      ...sxv(
        h,
        { "--tone": tones[row.tone] },
        styles.row,
        row.depth > 0 && styles.child,
        row.detail !== undefined && styles.open
      ),
      h.Title(row.title),
      h.OnClick(row.onSelect)
    ],
    [Gutter(h, row), h.div(sx(h, styles.plot), Bars(h, row))]
  ),
  ...(row.detail === undefined ? [] : [h.div(sxv(h, { "--depth": String(row.depth) }, styles.detail), row.detail)])
]

const Band = <M>(h: HtmlBuilder<M>, band: GanttBand): Html =>
  h.div(
    [
      ...sxv(
        h,
        { "--left": pct(band.left), "--width": pct(band.width) },
        styles.band,
        band.tone === "outage" ? styles.outage : styles.idle
      ),
      h.Title(band.label)
    ],
    [h.span(sx(h, styles.bandLabel, band.tone === "outage" ? styles.outageLabel : styles.idleLabel), [band.label])]
  )

const pointStyle = (kind: GanttPoint["kind"]) => {
  if (kind === "signal") return [styles.signal, styles.signalLine]
  if (kind === "timer") return [styles.timer, styles.timerLine]
  return [styles.noteDot, styles.noteLine]
}

const RunRow = <M>(h: HtmlBuilder<M>, props: GanttProps<M>): Html =>
  h.div(
    [...sx(h, styles.row, styles.runRow), h.Title(props.run.label)],
    [
      h.div(sxv(h, { "--depth": "0" }, styles.gutter), [h.span(sx(h, styles.name, styles.runName), [props.run.label])]),
      h.div(sx(h, styles.plot), [
        h.div(
          sxv(
            h,
            { "--width": pct(props.run.width), "--left": "0%" },
            styles.bar,
            styles.runBar,
            props.run.status === "running" && styles.runRunning,
            props.run.status === "waiting" && styles.runWaiting,
            props.run.status === "failed" && styles.runFailed
          ),
          []
        ),
        ...props.points.map((point) =>
          h.span(
            [...sxv(h, { "--left": pct(point.left) }, styles.point, pointStyle(point.kind)[0]), h.Title(point.title)],
            []
          )
        )
      ])
    ]
  )

export const Gantt = <M>(h: HtmlBuilder<M>, props: GanttProps<M>): Html =>
  h.div(
    [...sx(h, styles.frame), h.Role("figure"), h.AriaLabel("Run timeline")],
    [
      h.div(sx(h, styles.head), [
        h.div(sx(h, styles.headGutter), [h.span([], ["Step"]), h.span([], ["Took"])]),
        h.div(sx(h, styles.axis), [
          ...props.lines.map((line) => h.span(sxv(h, { "--left": pct(line.left) }, styles.tick), [line.label])),
          h.span(sx(h, styles.edge, styles.edgeStart), [props.startLabel]),
          h.span(sx(h, styles.edge, styles.edgeEnd), [props.endLabel])
        ])
      ]),
      h.div(sx(h, styles.body), [
        h.div(sx(h, styles.gutterLine), []),
        h.div(sx(h, styles.overlay), [
          ...props.lines.map((line) => h.div(sxv(h, { "--left": pct(line.left) }, styles.line), [])),
          ...props.bands.map((band) => Band(h, band)),
          ...props.points.map((point) =>
            h.div(sxv(h, { "--left": pct(point.left) }, styles.pointLine, pointStyle(point.kind)[1]), [])
          )
        ]),
        RunRow(h, props),
        ...props.rows.flatMap((row) => Row(h, row))
      ])
    ]
  )
