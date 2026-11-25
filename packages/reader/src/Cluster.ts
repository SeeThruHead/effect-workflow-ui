import { Array as Arr, Duration, Option, Order } from "effect"
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

export type Runner = {
  readonly address: string
  readonly healthy: boolean
  readonly lastHeartbeat: string
  readonly shards: number
}

export type Placement = {
  readonly runners: ReadonlyArray<Runner>
  readonly unowned: ReadonlyArray<string>
}

export const placement = (storage: Storage): Placement => {
  const locks = storage.locks ?? []
  const owned = new Set(locks.map((lock) => lock.shardId))
  const used = Arr.dedupe(Arr.getSomes(storage.messages.map((message) => Option.fromNullishOr(message.shardId))))

  return {
    runners: (storage.runners ?? []).map((runner) => ({
      ...runner,
      shards: locks.filter((lock) => lock.address === runner.address).length
    })),
    unowned:
      (storage.runners ?? []).length === 0
        ? []
        : Arr.sort(
            used.filter((shard) => !owned.has(shard)),
            Order.String
          )
  }
}
