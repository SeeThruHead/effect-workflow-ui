import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { clock, duration, json } from "../format.ts"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"
import { Disclosure } from "../layout/Disclosure.ts"
import { CodeBlock } from "./CodeBlock.ts"
import { Mono, Muted, StatusPill } from "./Labels.ts"

export type AttemptFailure = {
  readonly tag: string
  readonly message: string
  readonly kind: "failure" | "defect" | "interrupt"
  readonly detail: Readonly<Record<string, unknown>> | null
  readonly stack: string | null
}

export type Attempt = {
  readonly step: string
  readonly n: number
  readonly reason: "first" | "retry" | "restart"
  readonly input: string | null
  readonly startedAt: number
  readonly endedAt: number | null
  readonly boot: string
  readonly status: "running" | "done" | "accepted" | "failed" | "interrupted"
  readonly output: string | null
  readonly failure: AttemptFailure | null
}

const narrow = "@media (max-width: 700px)"

const styles = stylex.create({
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusSmall,
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  attempt: {
    display: "grid",
    gridTemplateColumns: { default: "84px 150px minmax(0, 1fr) 110px", [narrow]: "1fr" },
    gap: "10px",
    alignItems: "start",
    padding: "10px 12px",
    fontSize: shape.textSmall,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line
  },
  cell: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", minWidth: 0 },
  end: { alignItems: { default: "flex-end", [narrow]: "flex-start" } },
  number: { fontWeight: 700, fontFamily: shape.mono },
  body: { display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 },
  failure: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "8px 10px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderLeftWidth: "3px",
    borderLeftColor: colors.failed,
    borderRadius: shape.radiusSmall
  },
  tag: { fontFamily: shape.mono, fontWeight: 650, color: colors.failed },
  kind: { color: colors.inkFaint, fontSize: shape.textTiny },
  took: { fontFamily: shape.mono, fontWeight: 650, color: colors.ink },
  wait: {
    padding: { default: "4px 12px 4px 106px", [narrow]: "4px 12px" },
    fontSize: shape.textTiny,
    color: colors.retrying,
    backgroundColor: colors.retryingSoft,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line
  }
})

const reasons: Readonly<Record<Attempt["reason"], string>> = {
  first: "first try",
  retry: "retry",
  restart: "after a restart"
}

const kinds: Readonly<Record<AttemptFailure["kind"], string>> = {
  failure: "failure",
  defect: "defect, a bug",
  interrupt: "interrupt"
}

const pretty = (text: string | null): string => JSON.stringify(json(text), null, 2)

const failureView = <M>(h: HtmlBuilder<M>, failure: AttemptFailure): Html =>
  h.div(sx(h, styles.failure), [
    h.div([], [h.span(sx(h, styles.tag), [failure.tag]), " ", h.span(sx(h, styles.kind), [kinds[failure.kind]])]),
    h.span([], [failure.message]),
    ...(failure.detail === null ? [] : [CodeBlock(h, { text: JSON.stringify(failure.detail, null, 2) })]),
    ...(failure.stack === null
      ? []
      : [Disclosure(h, { summary: ["Stack trace"], children: [CodeBlock(h, { text: failure.stack })] })])
  ])

const tookFor = (attempt: Attempt, now: number): string => {
  if (attempt.endedAt !== null) return duration(attempt.endedAt - attempt.startedAt)
  if (attempt.status === "running") return duration(now - attempt.startedAt)
  return "never finished"
}

const attemptView = <M>(h: HtmlBuilder<M>, attempt: Attempt, now: number): Html =>
  h.li(sx(h, styles.attempt), [
    h.div(sx(h, styles.cell), [
      h.span(sx(h, styles.number), [`#${attempt.n}`]),
      Muted(h, { children: [reasons[attempt.reason]] })
    ]),
    h.div(sx(h, styles.cell), [StatusPill(h, { state: attempt.status }), Mono(h, { text: clock(attempt.startedAt) })]),
    h.div(sx(h, styles.body), [
      ...(attempt.failure === null ? [] : [failureView(h, attempt.failure)]),
      ...(attempt.output === null
        ? []
        : [Disclosure(h, { summary: ["Output"], children: [CodeBlock(h, { text: pretty(attempt.output) })] })]),
      ...(attempt.input === null
        ? []
        : [Disclosure(h, { summary: ["Input"], children: [CodeBlock(h, { text: pretty(attempt.input) })] })])
    ]),
    h.div(sx(h, styles.cell, styles.end), [
      h.span(sx(h, styles.took), [tookFor(attempt, now)]),
      Muted(h, { children: [`boot ${attempt.boot}`] })
    ])
  ])

const waitView = <M>(h: HtmlBuilder<M>, attempt: Attempt, next: Attempt | undefined): ReadonlyArray<Html> =>
  next === undefined || attempt.endedAt === null
    ? []
    : [h.li(sx(h, styles.wait), [`waited ${duration(next.startedAt - attempt.endedAt)} before #${next.n}`])]

export const AttemptList = <M>(
  h: HtmlBuilder<M>,
  props: { readonly step: string; readonly attempts: ReadonlyArray<Attempt>; readonly now: number }
): Html =>
  h.ol(
    [...sx(h, styles.list), h.AriaLabel(`Attempts of ${props.step}`)],
    props.attempts.flatMap((attempt, index) => [
      attemptView(h, attempt, props.now),
      ...waitView(h, attempt, props.attempts[index + 1])
    ])
  )
