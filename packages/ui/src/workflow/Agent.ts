import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"
import { Chip, Mono } from "./Basics.ts"
import { span } from "./format.ts"
import type { Status } from "./model.ts"
import { statusLabel, statusMeaning } from "./format.ts"

const styles = stylex.create({
  transcript: { display: "flex", flexDirection: "column", gap: "6px", fontFamily: shape.font, color: colors.ink },
  turn: {
    display: "grid",
    gridTemplateColumns: { default: "110px minmax(0, 1fr) 60px", "@media (max-width: 700px)": "80px minmax(0, 1fr)" },
    gap: "10px",
    fontSize: shape.textSmall,
    padding: "6px 10px",
    borderRadius: shape.radiusTiny,
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line
  },
  wait: { backgroundColor: colors.waitingSoft },
  failed: { borderColor: colors.failed },
  role: { fontSize: shape.textTiny, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em" },
  user: { color: colors.inkSoft },
  model: { color: colors.model },
  tool: { color: colors.tool },
  waitRole: { color: colors.waiting },
  code: { fontFamily: shape.mono, fontSize: "12.5px", whiteSpace: "pre-wrap", wordBreak: "break-word" },
  took: { fontFamily: shape.mono, textAlign: "right", color: colors.inkFaint },
  row: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontFamily: shape.font },
  swatches: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "10px",
    fontFamily: shape.font
  },
  swatch: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusSmall,
    overflow: "hidden",
    backgroundColor: colors.surface
  },
  colour: { height: "46px", display: "flex", alignItems: "center", gap: "8px", padding: "0 10px" },
  bar: { width: "28px", height: "12px", borderRadius: "3px", backgroundColor: "currentColor" },
  word: { fontSize: shape.textSmall, fontWeight: 650 },
  meta: { padding: "6px 10px", fontSize: shape.textTiny, color: colors.inkSoft },
  queued: { color: colors.queued, backgroundColor: colors.queuedSoft },
  running: { color: colors.running, backgroundColor: colors.runningSoft },
  waiting: { color: colors.waiting, backgroundColor: colors.waitingSoft },
  retrying: { color: colors.retrying, backgroundColor: colors.retryingSoft },
  done: { color: colors.done, backgroundColor: colors.doneSoft },
  accepted: { color: colors.accepted, backgroundColor: colors.acceptedSoft },
  failedTone: { color: colors.failed, backgroundColor: colors.failedSoft },
  interrupted: { color: colors.interrupted, backgroundColor: colors.interruptedSoft },
  compensating: { color: colors.compensating, backgroundColor: colors.compensatingSoft },
  suspended: { color: colors.suspended, backgroundColor: colors.suspendedSoft },
  bg: { color: colors.ink, backgroundColor: colors.bg },
  surface: { color: colors.ink, backgroundColor: colors.surface },
  sunken: { color: colors.ink, backgroundColor: colors.sunken },
  raised: { color: colors.ink, backgroundColor: colors.raised },
  line: { color: colors.ink, backgroundColor: colors.line },
  lineStrong: { color: colors.ink, backgroundColor: colors.lineStrong },
  ink: { color: colors.surface, backgroundColor: colors.ink },
  inkSoft: { color: colors.surface, backgroundColor: colors.inkSoft },
  inkFaint: { color: colors.surface, backgroundColor: colors.inkFaint },
  accent: { color: colors.surface, backgroundColor: colors.accent },
  accentSoft: { color: colors.ink, backgroundColor: colors.accentSoft },
  grid: { color: colors.ink, backgroundColor: colors.grid },
  agent: { color: colors.agent, backgroundColor: colors.agentSoft },
  modelTone: { color: colors.model, backgroundColor: colors.agentSoft },
  toolTone: { color: colors.tool, backgroundColor: colors.toolSoft }
})

export type TurnRole = "user" | "model" | "tool call" | "tool result" | "wait"

export type Turn = {
  readonly role: TurnRole
  readonly text: string
  readonly ms: number
  readonly tool?: string
  readonly failed?: boolean
}

const roleStyles: Readonly<Record<TurnRole, (typeof styles)["user"]>> = {
  user: styles.user,
  model: styles.model,
  "tool call": styles.tool,
  "tool result": styles.tool,
  wait: styles.waitRole
}

const roleText = (turn: Turn): string => {
  if (turn.tool === undefined) return turn.role
  return `${turn.role === "tool call" ? "→" : "←"} ${turn.tool}`
}

const isTool = (turn: Turn): boolean => turn.role === "tool call" || turn.role === "tool result"

export const Transcript = <M>(h: HtmlBuilder<M>, props: { readonly turns: ReadonlyArray<Turn> }): Html =>
  h.div(
    [...sx(h, styles.transcript), h.Role("list"), h.AriaLabel("Transcript")],
    props.turns.map((turn) =>
      h.div(
        [
          ...sx(h, styles.turn, turn.role === "wait" && styles.wait, turn.failed === true && styles.failed),
          h.Role("listitem")
        ],
        [
          h.span(sx(h, styles.role, roleStyles[turn.role]), [roleText(turn)]),
          h.span(sx(h, isTool(turn) && styles.code), [turn.text]),
          h.span(sx(h, styles.took), [turn.ms === 0 ? "" : span(turn.ms)])
        ]
      )
    )
  )

export const AgentSummary = <M>(
  h: HtmlBuilder<M>,
  props: { readonly facts: ReadonlyArray<string>; readonly conversation: string }
): Html =>
  h.div(sx(h, styles.row), [...props.facts.map((text) => Chip(h, { text })), Mono(h, { text: props.conversation })])

const statusTones: Readonly<Record<Status, (typeof styles)["done"]>> = {
  queued: styles.queued,
  running: styles.running,
  waiting: styles.waiting,
  retrying: styles.retrying,
  done: styles.done,
  accepted: styles.accepted,
  failed: styles.failedTone,
  interrupted: styles.interrupted,
  compensating: styles.compensating,
  suspended: styles.suspended
}

const statuses: ReadonlyArray<Status> = [
  "queued",
  "running",
  "waiting",
  "retrying",
  "done",
  "accepted",
  "failed",
  "interrupted",
  "compensating",
  "suspended"
]

export const StatusSwatches = <M>(h: HtmlBuilder<M>): Html =>
  h.div(
    sx(h, styles.swatches),
    statuses.map((status) =>
      h.div(sx(h, styles.swatch), [
        h.div(sx(h, styles.colour, statusTones[status]), [
          h.span(sx(h, styles.bar), []),
          h.span(sx(h, styles.word), [statusLabel[status]])
        ]),
        h.div(sx(h, styles.meta), [Mono(h, { text: `colors.${status}` }), h.div([], [statusMeaning[status]])])
      ])
    )
  )

const surfaces = {
  bg: styles.bg,
  surface: styles.surface,
  sunken: styles.sunken,
  raised: styles.raised,
  line: styles.line,
  lineStrong: styles.lineStrong,
  ink: styles.ink,
  inkSoft: styles.inkSoft,
  inkFaint: styles.inkFaint,
  accent: styles.accent,
  accentSoft: styles.accentSoft,
  grid: styles.grid,
  agent: styles.agent,
  model: styles.modelTone,
  tool: styles.toolTone
}

export const SurfaceSwatches = <M>(h: HtmlBuilder<M>): Html =>
  h.div(
    sx(h, styles.swatches),
    Object.entries(surfaces).map(([name, style]) =>
      h.div(sx(h, styles.swatch), [
        h.div(sx(h, styles.colour, style), []),
        h.div(sx(h, styles.meta), [Mono(h, { text: `colors.${name}` })])
      ])
    )
  )
