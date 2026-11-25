import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"
import { pretty, statusLabel, statusMeaning } from "./format.ts"
import type { Failure, Status } from "./model.ts"

const styles = stylex.create({
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: shape.font,
    fontSize: shape.textTiny,
    fontWeight: 650,
    letterSpacing: "0.02em",
    padding: "2px 8px 2px 7px",
    borderRadius: shape.radiusPill,
    whiteSpace: "nowrap"
  },
  dot: { width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "currentColor", flexShrink: 0 },
  pulse: { animationName: "wf-pulse", animationDuration: "1.6s", animationIterationCount: "infinite" },
  queued: { color: colors.queued, backgroundColor: colors.queuedSoft },
  running: { color: colors.running, backgroundColor: colors.runningSoft },
  waiting: { color: colors.waiting, backgroundColor: colors.waitingSoft },
  retrying: { color: colors.retrying, backgroundColor: colors.retryingSoft },
  done: { color: colors.done, backgroundColor: colors.doneSoft },
  accepted: { color: colors.accepted, backgroundColor: colors.acceptedSoft },
  failed: { color: colors.failed, backgroundColor: colors.failedSoft },
  interrupted: { color: colors.interrupted, backgroundColor: colors.interruptedSoft },
  compensating: { color: colors.compensating, backgroundColor: colors.compensatingSoft },
  suspended: { color: colors.suspended, backgroundColor: colors.suspendedSoft },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontFamily: shape.font,
    fontSize: shape.textTiny,
    padding: "1px 7px",
    borderRadius: shape.radiusTiny,
    backgroundColor: colors.sunken,
    color: colors.inkSoft,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    whiteSpace: "nowrap"
  },
  mono: { fontFamily: shape.mono, fontSize: "0.92em" },
  muted: { color: colors.inkSoft },
  faint: { color: colors.inkFaint, fontSize: shape.textTiny },
  payloadBox: { minWidth: 0, maxWidth: "100%" },
  payloadHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontFamily: shape.font,
    fontSize: shape.textTiny,
    fontWeight: 600,
    color: colors.inkSoft,
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  copy: {
    appearance: "none",
    fontFamily: shape.font,
    fontSize: shape.textTiny,
    textTransform: "none",
    letterSpacing: 0,
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: { default: colors.line, ":hover": colors.lineStrong },
    borderRadius: shape.radiusTiny,
    color: { default: colors.inkSoft, ":hover": colors.ink },
    padding: "1px 7px",
    cursor: "pointer"
  },
  payload: {
    margin: 0,
    padding: "10px 12px",
    backgroundColor: colors.sunken,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusSmall,
    fontFamily: shape.mono,
    fontSize: "12.5px",
    lineHeight: 1.55,
    overflow: "auto",
    maxHeight: "280px",
    maxWidth: "100%",
    color: colors.ink,
    whiteSpace: "pre"
  },
  failure: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "10px 12px",
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderLeftWidth: "3px",
    borderLeftColor: colors.failed,
    borderRadius: shape.radiusSmall,
    fontFamily: shape.font,
    color: colors.ink,
    minWidth: 0
  },
  row: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  tag: { fontFamily: shape.mono, fontWeight: 650, color: colors.failed },
  message: { fontSize: shape.text },
  summary: { cursor: "pointer", color: colors.inkSoft, fontSize: shape.textSmall },
  cause: {
    marginLeft: "14px",
    paddingLeft: "12px",
    borderLeftWidth: "1px",
    borderLeftStyle: "dashed",
    borderLeftColor: colors.lineStrong,
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  banner: {
    display: "flex",
    gap: "12px",
    padding: "10px 14px",
    borderRadius: shape.radiusSmall,
    borderWidth: "1px",
    borderStyle: "solid",
    fontFamily: shape.font,
    color: colors.ink
  },
  bannerFailed: { backgroundColor: colors.failedSoft, borderColor: colors.failed },
  bannerWaiting: { backgroundColor: colors.waitingSoft, borderColor: colors.waiting },
  bannerRetrying: { backgroundColor: colors.retryingSoft, borderColor: colors.retrying },
  bannerSuspended: { backgroundColor: colors.suspendedSoft, borderColor: colors.suspended },
  bannerInterrupted: { backgroundColor: colors.interruptedSoft, borderColor: colors.interrupted },
  bannerIcon: { fontSize: "16px", lineHeight: 1.3 },
  iconFailed: { color: colors.failed },
  iconWaiting: { color: colors.waiting },
  iconRetrying: { color: colors.retrying },
  iconSuspended: { color: colors.suspended },
  iconInterrupted: { color: colors.interrupted },
  bannerTitle: { fontWeight: 650 },
  bannerText: { color: colors.inkSoft, fontSize: shape.text },
  bannerActions: { marginTop: "6px", display: "flex", gap: "8px", flexWrap: "wrap" },
  button: {
    appearance: "none",
    fontFamily: shape.font,
    fontSize: shape.textSmall,
    fontWeight: 550,
    padding: "5px 11px",
    borderRadius: shape.radiusSmall,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: { default: colors.lineStrong, ":hover": colors.inkFaint },
    backgroundColor: colors.raised,
    color: colors.ink,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap"
  },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent, color: colors.surface },
  danger: { color: colors.failed }
})

const statusStyles: Readonly<Record<Status, (typeof styles)["done"]>> = {
  queued: styles.queued,
  running: styles.running,
  waiting: styles.waiting,
  retrying: styles.retrying,
  done: styles.done,
  accepted: styles.accepted,
  failed: styles.failed,
  interrupted: styles.interrupted,
  compensating: styles.compensating,
  suspended: styles.suspended
}

export const StatusBadge = <M>(h: HtmlBuilder<M>, props: { readonly status: Status; readonly live?: boolean }): Html =>
  h.span(
    [...sx(h, styles.badge, statusStyles[props.status]), h.Title(statusMeaning[props.status])],
    [h.span(sx(h, styles.dot, props.live === true && styles.pulse), []), statusLabel[props.status]]
  )

export const Chip = <M>(h: HtmlBuilder<M>, props: { readonly text: string; readonly title?: string }): Html =>
  h.span([...sx(h, styles.chip), ...(props.title === undefined ? [] : [h.Title(props.title)])], [props.text])

export const Mono = <M>(h: HtmlBuilder<M>, props: { readonly text: string }): Html =>
  h.span(sx(h, styles.mono), [props.text])

export const Faint = <M>(h: HtmlBuilder<M>, props: { readonly text: string }): Html =>
  h.span(sx(h, styles.faint), [props.text])

export const Payload = <M>(
  h: HtmlBuilder<M>,
  props: { readonly label: string; readonly value: unknown; readonly onCopy?: (text: string) => M }
): Html => {
  const text = pretty(props.value)
  return h.div(sx(h, styles.payloadBox), [
    h.div(sx(h, styles.payloadHead), [
      h.span([], [props.label]),
      ...(props.onCopy === undefined
        ? []
        : [
            h.button(
              [
                ...sx(h, styles.copy),
                h.Type("button"),
                h.AriaLabel(`Copy ${props.label}`),
                h.OnClick(props.onCopy(text))
              ],
              ["Copy"]
            )
          ])
    ]),
    h.pre(sx(h, styles.payload), [text])
  ])
}

const kindLabel: Readonly<Record<Failure["kind"], string>> = {
  failure: "typed failure",
  defect: "defect (a bug)",
  interrupt: "interrupt"
}

const failureBody = <M>(h: HtmlBuilder<M>, failure: Failure, onCopy?: (text: string) => M): ReadonlyArray<Html> => [
  h.div(sx(h, styles.row), [
    h.span(sx(h, styles.tag), [failure.tag]),
    Chip(h, { text: kindLabel[failure.kind], title: "How Effect classified it" }),
    Chip(h, {
      text: failure.retryable ? "retryable" : "not retryable",
      title: "Whether the retry policy will try again"
    })
  ]),
  h.span(sx(h, styles.message), [failure.message]),
  ...(failure.detail === undefined
    ? []
    : [Payload(h, { label: "Detail", value: failure.detail, ...(onCopy === undefined ? {} : { onCopy }) })]),
  ...(failure.stack === undefined
    ? []
    : [
        h.details(
          [],
          [h.summary(sx(h, styles.summary), ["Stack trace"]), h.pre(sx(h, styles.payload), [failure.stack])]
        )
      ]),
  ...(failure.cause === undefined
    ? []
    : [h.div(sx(h, styles.cause), [Faint(h, { text: "caused by" }), ...failureBody(h, failure.cause, onCopy)])])
]

export const FailurePanel = <M>(
  h: HtmlBuilder<M>,
  props: { readonly failure: Failure; readonly onCopy?: (text: string) => M }
): Html => h.div(sx(h, styles.failure), failureBody(h, props.failure, props.onCopy))

export type Action<M> = { readonly label: string; readonly onPress: M; readonly tone?: "primary" | "danger" }

export const ActionButton = <M>(h: HtmlBuilder<M>, action: Action<M>): Html =>
  h.button(
    [
      ...sx(h, styles.button, action.tone === "primary" && styles.primary, action.tone === "danger" && styles.danger),
      h.Type("button"),
      h.OnClick(action.onPress)
    ],
    [action.label]
  )

export const ActionBar = <M>(h: HtmlBuilder<M>, props: { readonly actions: ReadonlyArray<Action<M>> }): Html =>
  h.div(
    [...sx(h, styles.row), h.Role("toolbar"), h.AriaLabel("Run actions")],
    props.actions.map((action) => ActionButton(h, action))
  )

export type BannerTone = "failed" | "waiting" | "retrying" | "suspended" | "interrupted"

const bannerTones: Readonly<
  Record<BannerTone, readonly [(typeof styles)["bannerFailed"], (typeof styles)["iconFailed"]]>
> = {
  failed: [styles.bannerFailed, styles.iconFailed],
  waiting: [styles.bannerWaiting, styles.iconWaiting],
  retrying: [styles.bannerRetrying, styles.iconRetrying],
  suspended: [styles.bannerSuspended, styles.iconSuspended],
  interrupted: [styles.bannerInterrupted, styles.iconInterrupted]
}

export const StuckBanner = <M>(
  h: HtmlBuilder<M>,
  props: {
    readonly tone: BannerTone
    readonly title: string
    readonly text: string
    readonly actions?: ReadonlyArray<Action<M>>
  }
): Html => {
  const [box, icon] = bannerTones[props.tone]
  const actions = props.actions ?? []
  return h.div(
    [...sx(h, styles.banner, box), h.Role("status")],
    [
      h.span([...sx(h, styles.bannerIcon, icon), h.AriaHidden(true)], ["●"]),
      h.div(
        [],
        [
          h.div(sx(h, styles.bannerTitle), [props.title]),
          h.div(sx(h, styles.bannerText), [props.text]),
          ...(actions.length === 0
            ? []
            : [
                h.div(
                  sx(h, styles.bannerActions),
                  actions.map((action) => ActionButton(h, action))
                )
              ])
        ]
      )
    ]
  )
}

export const Muted = <M>(h: HtmlBuilder<M>, props: { readonly text: string }): Html =>
  h.span(sx(h, styles.muted), [props.text])
