import type { Attention, Concern } from "@effect-workflow/reader"
import { Banner, EmptyState, PageHeader, Stack, StuckBanner, type StuckTone, duration } from "@effect-workflow/ui"
import { String as Str } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

const tones: Readonly<Record<Concern, StuckTone>> = {
  failed: "failed",
  overdue: "retrying",
  stuck: "suspended",
  waiting: "waiting"
}

const labels: Readonly<Record<Concern, string>> = {
  failed: "failed",
  overdue: "overdue",
  stuck: "stuck",
  waiting: "waiting"
}

export type AttentionProps<M> = {
  readonly items: ReadonlyArray<Attention>
  readonly finished: number
  readonly now: number
  readonly open: (id: string) => M
}

const count = (items: ReadonlyArray<Attention>, concern: Concern): number =>
  items.filter((item) => item.concern === concern).length

const summary = <M>(h: HtmlBuilder<M>, props: AttentionProps<M>): Html => {
  const parts = (["failed", "overdue", "stuck", "waiting"] as const)
    .filter((concern) => count(props.items, concern) > 0)
    .map((concern) => `${count(props.items, concern)} ${labels[concern]}`)

  return Banner(h, {
    tone:
      count(props.items, "failed") + count(props.items, "overdue") + count(props.items, "stuck") > 0 ? "alarm" : "calm",
    title: parts.length === 0 ? "Nothing needs attention" : parts.join(", "),
    text: `${props.finished} runs finished cleanly. Failed, overdue and stuck runs come first, each with why.`
  })
}

const card = <M>(h: HtmlBuilder<M>, item: Attention, props: AttentionProps<M>): Html =>
  StuckBanner(h, {
    tone: tones[item.concern],
    title: `${item.run.workflow} ${Str.slice(0, 8)(item.run.id)}, ${labels[item.concern]} for ${duration(Math.max(0, props.now - item.since))}`,
    text: item.why,
    actions: [{ label: "Open run", onPress: props.open(item.run.id) }]
  })

export const AttentionPage = <M>(h: HtmlBuilder<M>, props: AttentionProps<M>): Html =>
  Stack(h, {
    gap: 16,
    children: [
      PageHeader(h, { title: ["Needs attention"] }),
      summary(h, props),
      ...(props.items.length === 0
        ? [EmptyState(h, { text: "No run is failed, overdue, stuck or waiting." })]
        : props.items.map((item) => card(h, item, props)))
    ]
  })
