import { Schema } from "effect"

export const MessageRow = Schema.Struct({
  id: Schema.String,
  requestId: Schema.String,
  entityType: Schema.String,
  entityId: Schema.String,
  tag: Schema.NullOr(Schema.String),
  payload: Schema.NullOr(Schema.String),
  processed: Schema.Boolean,
  deliverAt: Schema.NullOr(Schema.Finite),
  shardId: Schema.optionalKey(Schema.NullOr(Schema.String)),
  traceId: Schema.optionalKey(Schema.NullOr(Schema.String)),
  spanId: Schema.optionalKey(Schema.NullOr(Schema.String))
})

export type MessageRow = typeof MessageRow.Type

export const ReplyRow = Schema.Struct({
  id: Schema.String,
  requestId: Schema.String,
  payload: Schema.String
})

export type ReplyRow = typeof ReplyRow.Type

export const RunnerRow = Schema.Struct({
  address: Schema.String,
  healthy: Schema.Boolean,
  lastHeartbeat: Schema.String
})

export type RunnerRow = typeof RunnerRow.Type

export const LockRow = Schema.Struct({
  shardId: Schema.String,
  address: Schema.String,
  acquiredAt: Schema.String
})

export type LockRow = typeof LockRow.Type

export const Storage = Schema.Struct({
  messages: Schema.Array(MessageRow),
  replies: Schema.Array(ReplyRow),
  runners: Schema.optionalKey(Schema.Array(RunnerRow)),
  locks: Schema.optionalKey(Schema.Array(LockRow))
})

export type Storage = typeof Storage.Type

const Fail = Schema.TaggedStruct("Fail", { error: Schema.Unknown })

const Die = Schema.TaggedStruct("Die", { defect: Schema.Unknown })

const Interrupt = Schema.TaggedStruct("Interrupt", {})

export const Reason = Schema.Union([Fail, Die, Interrupt])

export type Reason = typeof Reason.Type

export const Exit = Schema.Union([
  Schema.TaggedStruct("Success", { value: Schema.Unknown }),
  Schema.TaggedStruct("Failure", { cause: Schema.Array(Reason) })
])

export type Exit = typeof Exit.Type

export const Result = Schema.Union([
  Schema.TaggedStruct("Complete", { exit: Exit }),
  Schema.TaggedStruct("Suspended", {})
])

export type Result = typeof Result.Type

export const RunPayload = Schema.Unknown

export const StepPayload = Schema.Struct({ name: Schema.String, attempt: Schema.Int })

export const ClockPayload = Schema.Struct({ name: Schema.String, wakeUp: Schema.Finite })

export const DeferredPayload = Schema.Struct({ name: Schema.String, exit: Exit })

export const json = <S extends Schema.Constraint>(schema: S) => Schema.fromJsonString(schema)

export const Recording = Schema.Struct({
  storage: Storage,
  now: Schema.Finite,
  traceUrl: Schema.optionalKey(Schema.String)
})

export type Recording = typeof Recording.Type

export class StorageUnreadable extends Schema.TaggedError<StorageUnreadable, { readonly brand: unique symbol }>()(
  "StorageUnreadable",
  { detail: Schema.String }
) {
  override get message() {
    return `the viewer could not read the cluster's storage: ${this.detail}`
  }
}
