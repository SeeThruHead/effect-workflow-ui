import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

export type State =
  | "queued"
  | "running"
  | "waiting"
  | "retrying"
  | "done"
  | "accepted"
  | "failed"
  | "interrupted"
  | "compensating"
  | "suspended"

const styles = stylex.create({
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 650,
    padding: "2px 8px 2px 7px",
    borderRadius: shape.radiusPill,
    whiteSpace: "nowrap",
    fontFamily: shape.font
  },
  dot: { width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "currentColor", display: "inline-block" },
  pulsing: { animationName: "wf-pulse", animationDuration: "1.2s", animationIterationCount: "infinite" },
  running: { color: colors.running, backgroundColor: colors.runningSoft },
  waiting: { color: colors.waiting, backgroundColor: colors.waitingSoft },
  done: { color: colors.done, backgroundColor: colors.doneSoft },
  failed: { color: colors.failed, backgroundColor: colors.failedSoft },
  queued: { color: colors.queued, backgroundColor: colors.queuedSoft },
  retrying: { color: colors.retrying, backgroundColor: colors.retryingSoft },
  accepted: { color: colors.accepted, backgroundColor: colors.acceptedSoft },
  interrupted: { color: colors.interrupted, backgroundColor: colors.interruptedSoft },
  compensating: { color: colors.compensating, backgroundColor: colors.compensatingSoft },
  suspended: { color: colors.suspended, backgroundColor: colors.suspendedSoft },
  badge: {
    display: "inline-block",
    fontSize: "11.5px",
    fontWeight: 600,
    padding: "1px 7px",
    borderRadius: "6px",
    whiteSpace: "nowrap",
    fontFamily: shape.font
  },
  neutral: { color: colors.inkSoft, backgroundColor: colors.sunken },
  alarm: { color: colors.failed, backgroundColor: colors.failedSoft },
  ok: { color: colors.done, backgroundColor: colors.doneSoft },
  warn: { color: colors.waiting, backgroundColor: colors.waitingSoft },
  signal: { color: colors.signal, backgroundColor: colors.signalSoft },
  quiet: { color: colors.inkSoft, backgroundColor: colors.sunken },
  live: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: colors.done,
    display: "inline-block",
    animationName: "wf-pulse",
    animationDuration: "2s",
    animationIterationCount: "infinite"
  },
  paused: { backgroundColor: colors.inkFaint, animationName: "none" },
  mono: { fontFamily: shape.mono, fontSize: "12px", color: colors.inkSoft },
  muted: { color: colors.inkSoft, fontSize: shape.textSmall }
})

const live: ReadonlySet<State> = new Set(["running", "retrying", "compensating"])

const words: Readonly<Record<State, string>> = {
  queued: "queued",
  running: "running",
  waiting: "waiting",
  retrying: "retrying",
  done: "done",
  accepted: "failed, carried on",
  failed: "failed",
  interrupted: "interrupted",
  compensating: "compensating",
  suspended: "suspended"
}

export const StatusPill = <M>(h: HtmlBuilder<M>, props: { readonly state: State }): Html =>
  h.span(sx(h, styles.pill, styles[props.state]), [
    h.span(sx(h, styles.dot, live.has(props.state) && styles.pulsing), []),
    words[props.state]
  ])

export type BadgeTone = "neutral" | "alarm" | "ok" | "warn" | "signal" | "quiet"

const badgeTones = {
  neutral: styles.neutral,
  alarm: styles.alarm,
  ok: styles.ok,
  warn: styles.warn,
  signal: styles.signal,
  quiet: styles.quiet
}

export const Badge = <M>(h: HtmlBuilder<M>, props: { readonly text: string; readonly tone?: BadgeTone }): Html =>
  h.span(sx(h, styles.badge, badgeTones[props.tone ?? "neutral"]), [props.text])

export const LiveDot = <M>(h: HtmlBuilder<M>, props: { readonly paused: boolean }): Html =>
  h.span([...sx(h, styles.live, props.paused && styles.paused), h.AriaLabel(props.paused ? "paused" : "live")], [])

export const Mono = <M>(h: HtmlBuilder<M>, props: { readonly text: string }): Html =>
  h.span(sx(h, styles.mono), [props.text])

export const Muted = <M>(h: HtmlBuilder<M>, props: { readonly children: ReadonlyArray<Html | string> }): Html =>
  h.span(sx(h, styles.muted), props.children)
