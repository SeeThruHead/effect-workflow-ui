import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"
import { type Action, ActionButton, Chip, FailurePanel, Faint, Mono, Muted, Payload, StatusBadge } from "./Basics.ts"
import { span, time } from "./format.ts"
import type { Attempt, Group, Outcome, Status } from "./model.ts"

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusSmall,
    overflow: "hidden",
    backgroundColor: colors.surface,
    fontFamily: shape.font,
    color: colors.ink
  },
  row: {
    display: "grid",
    gridTemplateColumns: { default: "74px 120px minmax(0, 1fr) 100px", "@media (max-width: 700px)": "1fr" },
    gap: "10px",
    padding: "8px 12px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    alignItems: "start",
    fontSize: shape.textSmall
  },
  stack: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px", minWidth: 0 },
  end: { alignItems: "flex-end", textAlign: "right" },
  number: { fontWeight: 700 },
  wait: {
    padding: "4px 12px 4px 96px",
    fontSize: shape.textTiny,
    color: colors.retrying,
    backgroundColor: colors.retryingSoft,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line
  },
  card: {
    display: "grid",
    gridTemplateColumns: { default: "1fr 1fr", "@media (max-width: 800px)": "1fr" },
    gap: "14px",
    padding: "12px 14px",
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusSmall,
    fontFamily: shape.font,
    color: colors.ink
  },
  column: { display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 },
  inline: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  kv: {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: "4px 10px",
    fontSize: shape.textSmall,
    alignContent: "start"
  },
  key: { color: colors.inkFaint },
  countdown: { fontFamily: shape.mono, fontWeight: 650, color: colors.retrying },
  head: {
    fontSize: shape.textTiny,
    fontWeight: 600,
    color: colors.inkSoft,
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  }
})

const outcomeStatus = (outcome: Outcome): Status => {
  if (outcome._tag === "success") return "done"
  if (outcome._tag === "accepted") return "accepted"
  if (outcome._tag === "failure") return "failed"
  if (outcome._tag === "interrupted") return "interrupted"
  return "running"
}

const reasonText: Readonly<Record<Attempt["reason"], string>> = {
  first: "first try",
  retry: "retry",
  restart: "after restart",
  "after wait": "after a wait"
}

type Copy<M> = { readonly onCopy?: (text: string) => M }

const copyProps = <M>(copy: Copy<M>) => (copy.onCopy === undefined ? {} : { onCopy: copy.onCopy })

const outcomeBody = <M>(h: HtmlBuilder<M>, attempt: Attempt, copy: Copy<M>): Html => {
  const outcome = attempt.outcome
  if (outcome._tag === "failure") return FailurePanel(h, { failure: outcome.error, ...copyProps(copy) })
  if (outcome._tag === "interrupted") return h.span([], [`Stopped: ${outcome.by}`])
  if (outcome._tag === "accepted")
    return h.div(sx(h, styles.column), [
      h.span([], [outcome.note]),
      Payload(h, { label: "Output", value: outcome.output, ...copyProps(copy) })
    ])
  if (outcome._tag === "success") return Payload(h, { label: "Output", value: outcome.output, ...copyProps(copy) })
  return Muted(h, {
    text:
      attempt.heartbeat === undefined
        ? "Running"
        : `Running, last heartbeat ${time(attempt.heartbeat.at)}: ${attempt.heartbeat.detail}`
  })
}

const waitRow = <M>(h: HtmlBuilder<M>, attempt: Attempt, next: Attempt | undefined): ReadonlyArray<Html> => {
  const waitTo = next?.scheduledAt ?? attempt.nextRetryAt
  if (waitTo === undefined) return []
  if (attempt.endedAt === null) return []
  return [
    h.div(sx(h, styles.wait), [
      next === undefined
        ? `next attempt at ${time(waitTo)}`
        : `waited ${span(waitTo - attempt.endedAt)} before #${next.n}`
    ])
  ]
}

const attemptRow = <M>(h: HtmlBuilder<M>, attempt: Attempt, now: number, copy: Copy<M>): Html => {
  const started = attempt.startedAt ?? attempt.scheduledAt
  const ended = attempt.endedAt ?? now
  return h.div(
    [...sx(h, styles.row), h.Role("listitem")],
    [
      h.div(sx(h, styles.stack), [
        h.strong(sx(h, styles.number), [`#${attempt.n}`]),
        Faint(h, { text: reasonText[attempt.reason] })
      ]),
      h.div(sx(h, styles.stack), [
        StatusBadge(h, { status: outcomeStatus(attempt.outcome), live: attempt.endedAt === null }),
        Mono(h, { text: time(started) })
      ]),
      outcomeBody(h, attempt, copy),
      h.div(sx(h, styles.stack, styles.end), [
        Mono(h, { text: span(ended - started) }),
        Chip(h, { text: `boot ${attempt.boot}`, title: "The server process that ran this attempt" })
      ])
    ]
  )
}

export const AttemptList = <M>(
  h: HtmlBuilder<M>,
  props: { readonly group: Group; readonly now: number; readonly onCopy?: (text: string) => M }
): Html =>
  h.div(
    [...sx(h, styles.list), h.Role("list"), h.AriaLabel(`Attempts of ${props.group.name}`)],
    props.group.attempts.flatMap((attempt, index) => [
      attemptRow(h, attempt, props.now, props),
      ...waitRow(h, attempt, props.group.attempts[index + 1])
    ])
  )

const failureChain = (group: Group): string =>
  group.attempts
    .flatMap((attempt) => (attempt.outcome._tag === "failure" ? [attempt.outcome.error.tag] : []))
    .join(" → ")

const fact = <M>(h: HtmlBuilder<M>, key: string, value: ReadonlyArray<Html | string>): ReadonlyArray<Html> => [
  h.span(sx(h, styles.key), [key]),
  h.span([], value)
]

export const PendingCard = <M>(
  h: HtmlBuilder<M>,
  props: {
    readonly group: Group
    readonly now: number
    readonly actions: ReadonlyArray<Action<M>>
    readonly onCopy?: (text: string) => M
  }
): Html => {
  const last = props.group.attempts.at(-1)
  const lastFailure = last?.outcome._tag === "failure" ? last.outcome.error : undefined
  const max = props.group.policy?.maxAttempts
  const n = last?.n ?? 0
  return h.div(
    [...sx(h, styles.card), h.Role("region"), h.AriaLabel(`Pending: ${props.group.name}`)],
    [
      h.div(sx(h, styles.column), [
        h.div(sx(h, styles.inline), [
          StatusBadge(h, { status: props.group.status, live: true }),
          h.strong([], [props.group.name])
        ]),
        h.div(sx(h, styles.kv), [
          ...fact(h, "Attempt", [
            Mono(h, { text: max === undefined ? String(n) : `${n} / ${max}` }),
            ...(max === undefined ? [] : [Muted(h, { text: ` · ${max - n} left` })])
          ]),
          ...(last?.nextRetryAt === undefined
            ? []
            : fact(h, "Next attempt", [
                `${time(last.nextRetryAt)} `,
                h.span(sx(h, styles.countdown), [`in ${span(last.nextRetryAt - props.now)}`])
              ])),
          ...fact(h, "Retry policy", [props.group.policy?.backoff ?? "none"]),
          ...fact(h, "Retries on", [props.group.policy?.retryOn ?? "nothing"]),
          ...fact(h, "Last ran on", ["boot ", Mono(h, { text: last?.boot ?? "" })]),
          ...fact(h, "Failures so far", [failureChain(props.group)])
        ]),
        h.div(
          sx(h, styles.inline),
          props.actions.map((action) => ActionButton(h, action))
        )
      ]),
      h.div(sx(h, styles.column), [
        h.div(sx(h, styles.head), ["Last failure"]),
        lastFailure === undefined
          ? Muted(h, { text: "None yet" })
          : FailurePanel(h, { failure: lastFailure, ...copyProps(props) })
      ])
    ]
  )
}
