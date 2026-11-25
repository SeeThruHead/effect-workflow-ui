import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx, sxv } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"
import { AttemptList } from "./Attempts.ts"
import { ActionButton, Chip, Muted, Payload, StatusBadge } from "./Basics.ts"
import { span, time } from "./format.ts"
import type { Attempt, Group, Outcome } from "./model.ts"

export type Range = { readonly start: number; readonly end: number }
export type Boot = { readonly id: string; readonly from: number; readonly to: number | null }

const lane = "26px"
const bar = "12px"

const styles = stylex.create({
  frame: {
    margin: 0,
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusSmall,
    overflow: "hidden",
    fontFamily: shape.font,
    color: colors.ink
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    padding: "8px 10px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    flexWrap: "wrap",
    fontSize: shape.textSmall
  },
  tools: { display: "flex", gap: "8px" },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "230px minmax(0, 1fr) 64px",
      "@media (max-width: 700px)": "130px minmax(0, 1fr) 54px"
    }
  },
  axis: {
    position: "relative",
    height: "26px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line
  },
  axisLabel: {
    position: "absolute",
    top: "6px",
    left: "var(--left)",
    transform: "translateX(-50%)",
    fontFamily: shape.mono,
    fontSize: "11px",
    color: colors.inkFaint,
    whiteSpace: "nowrap"
  },
  lane: {
    appearance: "none",
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns: "subgrid",
    padding: 0,
    margin: 0,
    borderWidth: 0,
    textAlign: "left",
    fontFamily: shape.font,
    color: colors.ink,
    cursor: "pointer",
    backgroundColor: { default: "transparent", ":hover": colors.sunken }
  },
  selected: { backgroundColor: { default: colors.accentSoft, ":hover": colors.accentSoft } },
  name: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "0 10px",
    height: lane,
    fontSize: shape.textSmall,
    whiteSpace: "nowrap",
    overflow: "hidden",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.grid
  },
  glyph: { color: colors.inkFaint, width: "12px", flexShrink: 0 },
  label: { overflow: "hidden", textOverflow: "ellipsis" },
  track: {
    position: "relative",
    height: lane,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.grid
  },
  took: {
    fontFamily: shape.mono,
    fontSize: "11.5px",
    color: colors.inkSoft,
    textAlign: "right",
    paddingRight: "10px",
    height: lane,
    lineHeight: lane,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.grid
  },
  gridLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "var(--left)",
    width: "1px",
    backgroundColor: colors.grid
  },
  band: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "var(--left)",
    width: "var(--width)",
    backgroundColor: colors.failedSoft
  },
  segment: {
    position: "absolute",
    top: `calc((${lane} - ${bar}) / 2)`,
    left: "var(--left)",
    width: "var(--width)",
    height: bar,
    borderRadius: "3px",
    minWidth: "3px",
    backgroundColor: "var(--tone)"
  },
  pending: {
    backgroundImage: "repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.28) 0 6px, transparent 6px 12px)"
  },
  queued: {
    backgroundColor: "transparent",
    backgroundImage: `repeating-linear-gradient(90deg, ${colors.queuedSoft} 0 4px, transparent 4px 6px)`,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.queued
  },
  backoff: {
    backgroundColor: "transparent",
    backgroundImage: `repeating-linear-gradient(135deg, ${colors.retryingSoft} 0 4px, transparent 4px 8px)`,
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: colors.retrying,
    height: "6px",
    top: `calc((${lane} - 6px) / 2)`
  },
  mark: {
    position: "absolute",
    top: "1px",
    left: "var(--left)",
    transform: "translateX(-50%)",
    fontFamily: shape.mono,
    fontSize: "10px",
    color: colors.inkFaint
  },
  legend: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    fontSize: shape.textTiny,
    color: colors.inkSoft,
    padding: "8px 10px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: colors.line
  },
  swatch: {
    display: "inline-block",
    width: "18px",
    height: "8px",
    borderRadius: "2px",
    verticalAlign: "middle",
    marginRight: "5px"
  },
  drawer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "12px",
    backgroundColor: colors.bg,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: colors.line
  },
  inline: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  pair: {
    display: "grid",
    gridTemplateColumns: { default: "minmax(0, 2fr) minmax(0, 1fr)", "@media (max-width: 700px)": "minmax(0, 1fr)" },
    gap: "12px"
  },
  done: { backgroundColor: colors.done },
  failed: { backgroundColor: colors.failed },
  interrupted: { backgroundColor: colors.interrupted },
  accepted: { backgroundColor: colors.accepted },
  waiting: { backgroundColor: colors.waiting },
  compensating: { backgroundColor: colors.compensating },
  crash: { backgroundColor: colors.failedSoft }
})

const kindGlyph: Readonly<Record<Group["kind"], string>> = {
  activity: "▸",
  clock: "◷",
  deferred: "◇",
  child: "⧉",
  compensation: "↺",
  agent: "✦",
  queue: "☰"
}

const tone = (outcome: Outcome, kind: Group["kind"]): string => {
  if (outcome._tag === "failure") return colors.failed
  if (outcome._tag === "interrupted") return colors.interrupted
  if (outcome._tag === "accepted") return colors.accepted
  if (outcome._tag === "pending") return colors.running
  if (kind === "compensation") return colors.compensating
  if (kind === "agent") return colors.agent
  return colors.done
}

const pct = (value: number): string => `${value.toFixed(3)}%`

const placed = (range: Range, from: number, to: number): { readonly "--left": string; readonly "--width": string } => {
  const whole = Math.max(range.end - range.start, 1)
  return {
    "--left": pct(((from - range.start) / whole) * 100),
    "--width": pct(Math.max(((to - from) / whole) * 100, 0.25))
  }
}

const queuedSegment = <M>(h: HtmlBuilder<M>, attempt: Attempt, range: Range): ReadonlyArray<Html> => {
  if (attempt.startedAt === null) return []
  if (attempt.startedAt - attempt.scheduledAt <= 300) return []
  return [
    h.div(
      [
        ...sxv(h, placed(range, attempt.scheduledAt, attempt.startedAt), styles.segment, styles.queued),
        h.Title(`attempt ${attempt.n} waited ${span(attempt.startedAt - attempt.scheduledAt)} for a process`)
      ],
      []
    )
  ]
}

const backoffSegment = <M>(
  h: HtmlBuilder<M>,
  attempt: Attempt,
  next: Attempt | undefined,
  range: Range
): ReadonlyArray<Html> => {
  const to = next?.scheduledAt ?? attempt.nextRetryAt
  if (to === undefined) return []
  if (attempt.endedAt === null) return []
  return [
    h.div(
      [
        ...sxv(h, placed(range, attempt.endedAt, to), styles.segment, styles.backoff),
        h.Title(`waited ${span(to - attempt.endedAt)} before attempt ${attempt.n + 1}`)
      ],
      []
    )
  ]
}

const attemptSegments = <M>(
  h: HtmlBuilder<M>,
  group: Group,
  attempt: Attempt,
  next: Attempt | undefined,
  range: Range,
  now: number
): ReadonlyArray<Html> => {
  const started = attempt.startedAt ?? now
  const ended = attempt.endedAt ?? now
  const where = placed(range, started, ended)
  return [
    ...queuedSegment(h, attempt, range),
    h.div(
      [
        ...sxv(
          h,
          { ...where, "--tone": tone(attempt.outcome, group.kind) },
          styles.segment,
          attempt.endedAt === null && styles.pending
        ),
        h.Title(`attempt ${attempt.n} (${attempt.reason}), ${span(ended - started)}, boot ${attempt.boot}`)
      ],
      []
    ),
    ...(group.attempts.length > 1
      ? [h.span(sxv(h, { "--left": where["--left"] }, styles.mark), [String(attempt.n)])]
      : []),
    ...backoffSegment(h, attempt, next, range)
  ]
}

const laneSegments = <M>(h: HtmlBuilder<M>, group: Group, range: Range, now: number): ReadonlyArray<Html> => {
  if (group.kind === "clock" || group.kind === "deferred")
    return [
      h.div(
        [
          ...sxv(
            h,
            { ...placed(range, group.start, group.end ?? now), "--tone": colors.waiting },
            styles.segment,
            group.end === null && styles.pending
          ),
          ...(group.summary === undefined ? [] : [h.Title(group.summary)])
        ],
        []
      )
    ]
  return group.attempts.flatMap((attempt, index) =>
    attemptSegments(h, group, attempt, group.attempts[index + 1], range, now)
  )
}

const ticks = (range: Range): ReadonlyArray<number> => {
  const whole = range.end - range.start
  const steps = [1000, 5000, 10_000, 30_000, 60_000, 120_000, 300_000, 600_000, 1_800_000, 3_600_000]
  const step = steps.find((candidate) => whole / candidate <= 8) ?? 3_600_000
  return Array.from({ length: Math.floor(whole / step) + 1 }, (_, index) => range.start + index * step)
}

type Outage = { readonly from: number; readonly to: number; readonly label: string }

const outagesOf = (boots: ReadonlyArray<Boot>): ReadonlyArray<Outage> =>
  boots.flatMap((boot, index) => {
    const next = boots[index + 1]
    if (boot.to === null) return []
    if (next === undefined) return []
    return [{ from: boot.to, to: next.from, label: `${boot.id} died; ${next.id} resumed the run` }]
  })

const legendItems: ReadonlyArray<readonly [string, (typeof styles)["done"]]> = [
  ["done", styles.done],
  ["attempt failed", styles.failed],
  ["waiting to retry", styles.backoff],
  ["queued", styles.queued],
  ["durable wait", styles.waiting],
  ["interrupted", styles.interrupted],
  ["failure accepted", styles.accepted],
  ["compensation", styles.compensating],
  ["no process (crash)", styles.crash]
]

export type TimelineProps<M> = {
  readonly groups: ReadonlyArray<Group>
  readonly range: Range
  readonly now: number
  readonly boots?: ReadonlyArray<Boot>
  readonly selected: string | null
  readonly newestFirst: boolean
  readonly onSelect: (id: string) => M
  readonly onToggleOrder: M
  readonly onCopy?: (text: string) => M
}

const drawer = <M>(h: HtmlBuilder<M>, chosen: Group, props: TimelineProps<M>): Html =>
  h.div(
    [...sx(h, styles.drawer), h.Role("region"), h.AriaLabel(`${chosen.name} details`)],
    [
      h.div(sx(h, styles.inline), [
        StatusBadge(h, { status: chosen.status, live: chosen.end === null }),
        h.strong([], [chosen.name]),
        Muted(h, { text: `${chosen.kind}${chosen.compensates === undefined ? "" : `, undoes ${chosen.compensates}`}` }),
        ...(chosen.summary === undefined ? [] : [Muted(h, { text: `· ${chosen.summary}` })])
      ]),
      ...(chosen.input === undefined && chosen.policy === undefined
        ? []
        : [
            h.div(sx(h, styles.pair), [
              chosen.input === undefined
                ? h.span([], [])
                : Payload(h, {
                    label: "Input",
                    value: chosen.input,
                    ...(props.onCopy === undefined ? {} : { onCopy: props.onCopy })
                  }),
              ...(chosen.policy === undefined ? [] : [Payload(h, { label: "Retry policy", value: chosen.policy })])
            ])
          ]),
      ...(chosen.attempts.length === 0
        ? []
        : [
            AttemptList(h, {
              group: chosen,
              now: props.now,
              ...(props.onCopy === undefined ? {} : { onCopy: props.onCopy })
            })
          ])
    ]
  )

const laneRow = <M>(h: HtmlBuilder<M>, group: Group, props: TimelineProps<M>, outages: ReadonlyArray<Outage>): Html =>
  h.button(
    [
      ...sx(h, styles.lane, props.selected === group.id && styles.selected),
      h.Type("button"),
      h.AriaLabel(`${group.name}: ${group.status}, ${group.attempts.length} attempts`),
      h.AriaExpanded(props.selected === group.id),
      h.OnClick(props.onSelect(group.id))
    ],
    [
      h.span(sx(h, styles.name), [
        h.span([...sx(h, styles.glyph), h.AriaHidden(true)], [kindGlyph[group.kind]]),
        h.span(sx(h, styles.label), [group.name]),
        ...(group.attempts.length > 1 ? [Chip(h, { text: `↻${group.attempts.length}`, title: "attempts" })] : [])
      ]),
      h.span(sx(h, styles.track), [
        ...ticks(props.range).map((tick) =>
          h.span(sxv(h, { "--left": placed(props.range, tick, tick)["--left"] }, styles.gridLine), [])
        ),
        ...outages.map((outage) =>
          h.span([...sxv(h, placed(props.range, outage.from, outage.to), styles.band), h.Title(outage.label)], [])
        ),
        ...laneSegments(h, group, props.range, props.now)
      ]),
      h.span(sx(h, styles.took), [span((group.end ?? props.now) - group.start)])
    ]
  )

export const Timeline = <M>(h: HtmlBuilder<M>, props: TimelineProps<M>): Html => {
  const ordered = props.newestFirst ? props.groups.toReversed() : props.groups
  const outages = outagesOf(props.boots ?? [])
  const chosen = props.groups.find((group) => group.id === props.selected)
  return h.figure(
    [...sx(h, styles.frame), h.AriaLabel("Timeline")],
    [
      h.div(sx(h, styles.toolbar), [
        Muted(h, { text: `${props.groups.length} steps · ${time(props.range.start)} to ${time(props.range.end)}` }),
        h.div(sx(h, styles.tools), [
          ActionButton(h, {
            label: props.newestFirst ? "↓ Newest first" : "↑ Oldest first",
            onPress: props.onToggleOrder
          })
        ])
      ]),
      h.div(sx(h, styles.grid), [
        h.div(sx(h, styles.axis), []),
        h.div(
          sx(h, styles.axis),
          ticks(props.range).map((tick) =>
            h.span(sxv(h, { "--left": placed(props.range, tick, tick)["--left"] }, styles.axisLabel), [
              `+${span(tick - props.range.start)}`
            ])
          )
        ),
        h.div(sx(h, styles.axis), []),
        ...ordered.map((group) => laneRow(h, group, props, outages))
      ]),
      h.div(
        sx(h, styles.legend),
        legendItems.map(([text, swatch]) => h.span([], [h.span(sx(h, styles.swatch, swatch), []), text]))
      ),
      ...(chosen === undefined ? [] : [drawer(h, chosen, props)])
    ]
  )
}
