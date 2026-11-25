import type { Execution, Group } from "@effect-workflow/ui"
import { Array as Arr, Duration, Option, Order } from "effect"
import { at, signalWait } from "./Journal.ts"
import type { MessageRow, Storage } from "./Rows.ts"

export type Concern = "failed" | "overdue" | "stuck" | "waiting"

export type Attention = {
  readonly concern: Concern
  readonly run: Execution
  readonly why: string
  readonly since: number
}

export type Thresholds = { readonly overdueAfter: Duration.Duration; readonly stuckAfter: Duration.Duration }

export const defaultThresholds: Thresholds = {
  overdueAfter: Duration.minutes(1),
  stuckAfter: Duration.minutes(15)
}

const ago = (now: number, since: number): string =>
  Duration.format(Duration.seconds(Math.round(Math.max(0, now - since) / 1000)))

const lastActivity = (run: Execution): number =>
  Option.getOrElse(Arr.last(run.events.map((event) => event.at)), () => run.startedAt)

const lateClock = (run: Execution, now: number, limit: number): Option.Option<Group> =>
  Arr.findFirst(
    run.groups,
    (group) => group.kind === "clock" && group.status === "waiting" && (group.end ?? now) < now - limit
  )

const unread = (storage: Storage, run: Execution, now: number, limit: number): ReadonlyArray<MessageRow> =>
  storage.messages.filter(
    (message) =>
      message.entityId === run.id && !message.processed && (message.deliverAt ?? at(message.id)) < now - limit
  )

const overdue = (storage: Storage, run: Execution, now: number, limit: number): Option.Option<Attention> => {
  const clock = lateClock(run, now, limit)
  if (Option.isSome(clock))
    return Option.some({
      concern: "overdue",
      run,
      why: `durable sleep ${clock.value.name} was due ${ago(now, clock.value.end ?? now)} ago and has not fired`,
      since: clock.value.end ?? now
    })
  const oldest = Arr.head(unread(storage, run, now, limit))
  if (Option.isNone(oldest)) return Option.none()
  const due = oldest.value.deliverAt ?? at(oldest.value.id)

  return Option.some({
    concern: "overdue",
    run,
    why: `a ${oldest.value.tag ?? "message"} message has waited ${ago(now, due)} without being read`,
    since: due
  })
}

const stuck = (run: Execution, now: number, limit: number): Option.Option<Attention> => {
  const quiet = lastActivity(run)
  if (now - quiet < limit) return Option.none()
  if (run.status === "running")
    return Option.some({
      concern: "stuck",
      run,
      why: `${run.currentDetails ?? "running"} for ${ago(now, quiet)}`,
      since: quiet
    })
  if (run.currentDetails !== signalWait) return Option.none()

  return Option.some({
    concern: "stuck",
    run,
    why: `suspended with nothing scheduled for ${ago(now, quiet)}; it waits on a signal that may never come`,
    since: quiet
  })
}

const failed = (run: Execution): Option.Option<Attention> =>
  run.status === "failed"
    ? Option.some({
        concern: "failed",
        run,
        why: run.failure === undefined ? "failed" : `${run.failure.tag}: ${run.failure.message}`,
        since: run.endedAt ?? run.startedAt
      })
    : Option.none()

const waiting = (run: Execution): Option.Option<Attention> =>
  run.status === "waiting" || run.status === "queued"
    ? Option.some({ concern: "waiting", run, why: run.currentDetails ?? run.status, since: lastActivity(run) })
    : Option.none()

const concernFor =
  (storage: Storage, now: number, thresholds: Thresholds) =>
  (run: Execution): Option.Option<Attention> =>
    failed(run).pipe(
      Option.orElse(() =>
        run.endedAt === null ? overdue(storage, run, now, Duration.toMillis(thresholds.overdueAfter)) : Option.none()
      ),
      Option.orElse(() =>
        run.endedAt === null ? stuck(run, now, Duration.toMillis(thresholds.stuckAfter)) : Option.none()
      ),
      Option.orElse(() => waiting(run))
    )

const rank: Readonly<Record<Concern, number>> = { failed: 0, overdue: 1, stuck: 2, waiting: 3 }

const byConcern = Order.combine(
  Order.mapInput(Order.Number, (item: Attention) => rank[item.concern]),
  Order.mapInput(Order.flip(Order.Number), (item: Attention) => item.since)
)

export const attention = (
  runs: ReadonlyArray<Execution>,
  storage: Storage,
  now: number,
  thresholds: Thresholds = defaultThresholds
): ReadonlyArray<Attention> => Arr.sort(Arr.getSomes(runs.map(concernFor(storage, now, thresholds))), byConcern)
