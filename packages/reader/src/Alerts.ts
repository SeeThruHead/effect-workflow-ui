import type { Execution } from "@effect-workflow/ui"
import { Schema, String as Str } from "effect"
import type { Attention } from "./Attention.ts"
import type { Mailbox, Placement } from "./Cluster.ts"

export const Alert = Schema.Struct({
  concern: Schema.Literals(["failed", "overdue", "stuck"]),
  workflow: Schema.String,
  runId: Schema.String,
  why: Schema.String,
  since: Schema.Finite
})

export type Alert = typeof Alert.Type

const alerting = (item: Attention): item is Attention & { readonly concern: Alert["concern"] } =>
  item.concern !== "waiting"

export const alertsOf = (items: ReadonlyArray<Attention>): ReadonlyArray<Alert> =>
  items.filter(alerting).map((item) => ({
    concern: item.concern,
    workflow: item.run.workflow,
    runId: item.run.id,
    why: item.why,
    since: item.since
  }))

export const alertKey = (alert: Alert): string => `${alert.concern}:${alert.runId}`

export type Delivery = { readonly fresh: ReadonlyArray<Alert>; readonly open: ReadonlySet<string> }

export const deliver = (alerts: ReadonlyArray<Alert>, open: ReadonlySet<string>): Delivery => ({
  fresh: alerts.filter((alert) => !open.has(alertKey(alert))),
  open: new Set(alerts.map(alertKey))
})

const label = (value: string): string => Str.replaceAll('"', '\\"')(Str.replaceAll("\\", "\\\\")(value))

const gauge = (name: string, help: string, samples: ReadonlyArray<readonly [string, number]>): string =>
  [
    `# HELP ${name} ${help}`,
    `# TYPE ${name} gauge`,
    ...samples.map(([labels, value]) => `${name}${labels} ${value}`)
  ].join("\n")

const count = <A>(items: ReadonlyArray<A>, keep: (item: A) => boolean): number => items.filter(keep).length

const statuses = ["running", "waiting", "queued", "done", "failed", "interrupted"] as const

const concerns = ["failed", "overdue", "stuck", "waiting"] as const

export type MetricsInput = {
  readonly runs: ReadonlyArray<Execution>
  readonly attention: ReadonlyArray<Attention>
  readonly mailboxes: ReadonlyArray<Mailbox>
  readonly placement: Placement
  readonly now: number
}

export const metricsText = (input: MetricsInput): string => {
  const oldest = Math.min(...input.mailboxes.map((mailbox) => mailbox.oldestOverdueAt ?? input.now), input.now)

  return [
    gauge(
      "effect_workflow_runs",
      "Workflow runs read from cluster storage, by status.",
      statuses.map((status) => [`{status="${status}"}`, count(input.runs, (run) => run.status === status)])
    ),
    gauge(
      "effect_workflow_attention",
      "Runs that need attention, by concern.",
      concerns.map((concern) => [`{concern="${concern}"}`, count(input.attention, (item) => item.concern === concern)])
    ),
    gauge(
      "effect_workflow_mailbox_unprocessed",
      "Unprocessed messages, by entity type.",
      input.mailboxes.map((mailbox) => [`{entity_type="${label(mailbox.entityType)}"}`, mailbox.unprocessed])
    ),
    gauge(
      "effect_workflow_mailbox_overdue",
      "Messages past due and unread, by entity type.",
      input.mailboxes.map((mailbox) => [`{entity_type="${label(mailbox.entityType)}"}`, mailbox.overdue])
    ),
    gauge("effect_workflow_oldest_overdue_seconds", "How long the oldest past-due message has waited.", [
      ["", Math.round((input.now - oldest) / 1000)]
    ]),
    gauge(
      "effect_workflow_runners",
      "Runners registered in storage: live, silent (no recent heartbeat) or unhealthy.",
      [
        ['{state="live"}', count(input.placement.runners, (runner) => runner.state === "live")],
        ['{state="silent"}', count(input.placement.runners, (runner) => runner.state === "silent")],
        ['{state="unhealthy"}', count(input.placement.runners, (runner) => runner.state === "unhealthy")]
      ]
    ),
    gauge("effect_workflow_unowned_shards", "Shards with messages that no runner holds.", [
      ["", input.placement.unowned.length]
    ])
  ].join("\n\n")
}
