import type { Mailbox, Placement, Runner, RunnerState } from "@effect-workflow/reader"
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

const stateLabels: Readonly<Record<RunnerState, string>> = {
  live: "live",
  silent: "silent: no heartbeat",
  unhealthy: "marked unhealthy"
}

const heard = (runner: Runner, now: number): string =>
  runner.heardAt === null ? runner.lastHeartbeat : `${duration(Math.max(0, now - runner.heardAt))} ago`

const shardsHeld = (runner: Runner, placement: Placement): string =>
  placement.ownership === "locks" ? String(runner.shards) : "not stored"

const silentBanner = <M>(h: HtmlBuilder<M>, placement: Placement, now: number): ReadonlyArray<Html> => {
  const quiet = placement.runners.filter((runner) => runner.state !== "live")
  if (quiet.length === 0) return []

  return [
    Banner(h, {
      tone: "alarm",
      title: quiet.length === 1 ? "1 runner has gone quiet" : `${quiet.length} runners have gone quiet`,
      text: quiet.map((runner) => `${runner.address}, last heard ${heard(runner, now)}`).join("; ")
    })
  ]
}

const ownershipNote = <M>(h: HtmlBuilder<M>, placement: Placement): ReadonlyArray<Html> => {
  if (placement.ownership === "unknown")
    return [
      EmptyState(h, {
        text: "Shard ownership is not in storage: the shard locks table is empty, which is what a Postgres cluster using advisory locks (Effect's default) looks like."
      })
    ]
  if (placement.unowned.length === 0) return []

  return [
    Banner(h, {
      tone: "warn",
      title: `${placement.unowned.length} shards with messages have no runner holding them`,
      text: placement.unowned.join(", ")
    })
  ]
}

const runnersSection = <M>(h: HtmlBuilder<M>, placement: Placement, now: number): Html =>
  placement.runners.length === 0
    ? EmptyState(h, {
        text: "No runners are registered in storage. A SingleRunner cluster, or one that keeps runners in memory, stores none."
      })
    : Stack(h, {
        children: [
          ...silentBanner(h, placement, now),
          Table(h, {
            label: "Runners",
            columns: [
              { label: "Address", align: "mono" },
              { label: "State" },
              { label: "Last heartbeat" },
              { label: "Shards held", align: "number" }
            ],
            rows: placement.runners.map((runner) => ({
              key: runner.address,
              cells: [runner.address, stateLabels[runner.state], heard(runner, now), shardsHeld(runner, placement)],
              ...(runner.state === "live" ? {} : { tint: "alarm" as const })
            }))
          }),
          ...ownershipNote(h, placement)
        ]
      })

export const ClusterPage = <M>(h: HtmlBuilder<M>, props: ClusterProps): Html =>
  Stack(h, {
    gap: 16,
    children: [
      PageHeader(h, { title: ["Cluster"] }),
      summary(h, props),
      Section(h, { title: "Mailboxes by entity type", children: [mailboxTable(h, props)] }),
      Section(h, { title: "Runners and shards", children: [runnersSection(h, props.placement, props.now)] })
    ]
  })
