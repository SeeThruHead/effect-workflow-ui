import type { Mailbox, Placement } from "@effect-workflow/reader"
import { Banner, EmptyState, PageHeader, Section, Stack, Table, clock, duration } from "@effect-workflow/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

export type ClusterProps = {
  readonly mailboxes: ReadonlyArray<Mailbox>
  readonly placement: Placement
  readonly now: number
}

const overdueTotal = (mailboxes: ReadonlyArray<Mailbox>): number =>
  mailboxes.reduce((total, mailbox) => total + mailbox.overdue, 0)

const oldestOverdue = (mailboxes: ReadonlyArray<Mailbox>): number | null => {
  const times = mailboxes.flatMap((mailbox) => (mailbox.oldestOverdueAt === null ? [] : [mailbox.oldestOverdueAt]))

  return times.length === 0 ? null : Math.min(...times)
}

const summary = <M>(h: HtmlBuilder<M>, props: ClusterProps): Html => {
  const late = overdueTotal(props.mailboxes)
  const oldest = oldestOverdue(props.mailboxes)
  const unprocessed = props.mailboxes.reduce((total, mailbox) => total + mailbox.unprocessed, 0)

  return late > 0
    ? Banner(h, {
        tone: "alarm",
        title: late === 1 ? "1 message is past due and unread" : `${late} messages are past due and unread`,
        text: `The oldest has waited ${duration(Math.max(0, props.now - (oldest ?? props.now)))}. Is a runner reading this storage?`
      })
    : Banner(h, {
        tone: "calm",
        title: "Nothing overdue",
        text: `${unprocessed} unprocessed messages, none past due.`
      })
}

const due = (at: number | null, now: number): string => {
  if (at === null) return "·"
  if (at <= now) return "now"

  return `in ${duration(at - now)} (${clock(at)})`
}

const mailboxTable = <M>(h: HtmlBuilder<M>, props: ClusterProps): Html =>
  Table(h, {
    label: "Mailboxes by entity type",
    columns: [
      { label: "Entity type", align: "mono" },
      { label: "Messages", align: "number" },
      { label: "Unprocessed", align: "number" },
      { label: "Past due", align: "number" },
      { label: "Next due" },
      { label: "Entities", align: "number" },
      { label: "Shards", align: "number" }
    ],
    rows: props.mailboxes.map((mailbox) => ({
      key: mailbox.entityType,
      cells: [
        mailbox.entityType,
        String(mailbox.messages),
        String(mailbox.unprocessed),
        String(mailbox.overdue),
        due(mailbox.nextDueAt, props.now),
        String(mailbox.entities),
        String(mailbox.shards)
      ],
      ...(mailbox.overdue > 0 ? { tint: "alarm" as const } : {})
    }))
  })

const runnersSection = <M>(h: HtmlBuilder<M>, placement: Placement): Html =>
  placement.runners.length === 0
    ? EmptyState(h, {
        text: "No runners are registered in storage. A SingleRunner cluster, or one that keeps runners in memory, stores none."
      })
    : Stack(h, {
        children: [
          Table(h, {
            label: "Runners",
            columns: [
              { label: "Address", align: "mono" },
              { label: "Healthy" },
              { label: "Last heartbeat", align: "mono" },
              { label: "Shards held", align: "number" }
            ],
            rows: placement.runners.map((runner) => ({
              key: runner.address,
              cells: [runner.address, runner.healthy ? "yes" : "no", runner.lastHeartbeat, String(runner.shards)],
              ...(runner.healthy ? {} : { tint: "alarm" as const })
            }))
          }),
          ...(placement.unowned.length === 0
            ? []
            : [
                Banner(h, {
                  tone: "warn",
                  title: `${placement.unowned.length} shards with messages have no runner holding them`,
                  text: placement.unowned.join(", ")
                })
              ])
        ]
      })

export const ClusterPage = <M>(h: HtmlBuilder<M>, props: ClusterProps): Html =>
  Stack(h, {
    gap: 16,
    children: [
      PageHeader(h, { title: ["Cluster"] }),
      summary(h, props),
      Section(h, { title: "Mailboxes by entity type", children: [mailboxTable(h, props)] }),
      Section(h, { title: "Runners and shards", children: [runnersSection(h, props.placement)] })
    ]
  })
