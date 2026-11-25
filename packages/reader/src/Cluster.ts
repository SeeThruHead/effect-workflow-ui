import { Array as Arr, DateTime, Duration, Option, Order, String as Str } from "effect"
import { at } from "./Journal.ts"
import type { MessageRow, Storage } from "./Rows.ts"

export type Mailbox = {
  readonly entityType: string
  readonly messages: number
  readonly unprocessed: number
  readonly overdue: number
  readonly oldestOverdueAt: number | null
  readonly nextDueAt: number | null
  readonly entities: number
  readonly shards: number
}

const dueAt = (message: MessageRow): number => message.deliverAt ?? at(message.id)

const earliest = (times: ReadonlyArray<number>): number | null =>
  Option.getOrNull(Arr.head(Arr.sort(times, Order.Number)))

const mailboxOf =
  (now: number, limit: number) =>
  ([entityType, messages]: readonly [string, Arr.NonEmptyReadonlyArray<MessageRow>]): Mailbox => {
    const waiting = messages.filter((message) => !message.processed)
    const late = waiting.filter((message) => dueAt(message) < now - limit)

    return {
      entityType,
      messages: messages.length,
      unprocessed: waiting.length,
      overdue: late.length,
      oldestOverdueAt: earliest(late.map(dueAt)),
      nextDueAt: earliest(waiting.map(dueAt).filter((due) => due >= now)),
      entities: new Set(messages.map((message) => message.entityId)).size,
      shards: new Set(Arr.getSomes(messages.map((message) => Option.fromNullishOr(message.shardId)))).size
    }
  }

const worstFirst = Order.combine(
  Order.mapInput(Order.flip(Order.Number), (mailbox: Mailbox) => mailbox.overdue),
  Order.mapInput(Order.flip(Order.Number), (mailbox: Mailbox) => mailbox.messages)
)

export const mailboxes = (
  storage: Storage,
  now: number,
  overdueAfter: Duration.Duration = Duration.minutes(1)
): ReadonlyArray<Mailbox> =>
  Arr.sort(
    Object.entries(Arr.groupBy(storage.messages, (message) => message.entityType)).map(
      mailboxOf(now, Duration.toMillis(overdueAfter))
    ),
    worstFirst
  )

export type RunnerState = "live" | "silent" | "unhealthy"

export type Runner = {
  readonly address: string
  readonly healthy: boolean
  readonly lastHeartbeat: string
  readonly heardAt: number | null
  readonly state: RunnerState
  readonly shards: number
}

export type Ownership = "none" | "locks" | "unknown"

export type Placement = {
  readonly runners: ReadonlyArray<Runner>
  readonly unowned: ReadonlyArray<string>
  readonly ownership: Ownership
}

export const heardAt = (stamp: string): number | null =>
  Option.getOrNull(
    Option.map(DateTime.make(`${Str.replace(" ", "T")(Str.trim(stamp))}Z`), (time) => DateTime.toEpochMillis(time))
  )

const stateOf = (healthy: boolean, heard: number | null, now: number, limit: number): RunnerState => {
  if (!healthy) return "unhealthy"
  if (heard === null) return "live"

  return now - heard > limit ? "silent" : "live"
}

const ownershipOf = (runners: number, locks: number): Ownership => {
  if (runners === 0) return "none"

  return locks === 0 ? "unknown" : "locks"
}

export const placement = (
  storage: Storage,
  now: number,
  silentAfter: Duration.Duration = Duration.seconds(45)
): Placement => {
  const locks = storage.locks ?? []
  const registered = storage.runners ?? []
  const ownership = ownershipOf(registered.length, locks.length)
  const owned = new Set(locks.map((lock) => lock.shardId))
  const used = Arr.dedupe(Arr.getSomes(storage.messages.map((message) => Option.fromNullishOr(message.shardId))))

  return {
    runners: registered.map((runner) => ({
      ...runner,
      heardAt: heardAt(runner.lastHeartbeat),
      state: stateOf(runner.healthy, heardAt(runner.lastHeartbeat), now, Duration.toMillis(silentAfter)),
      shards: locks.filter((lock) => lock.address === runner.address).length
    })),
    unowned:
      ownership === "locks"
        ? Arr.sort(
            used.filter((shard) => !owned.has(shard)),
            Order.String
          )
        : [],
    ownership
  }
}
