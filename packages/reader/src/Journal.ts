import type { Attempt, EventKind, Execution, Failure, Group, Outcome, Status, WfEvent } from "@effect-workflow/ui"
import { Array as Arr, DateTime, Option, Order, Predicate, Schema, String as Str } from "effect"
import { Snowflake } from "effect/cluster"
import type { DecodableWorkflow } from "./Decode.ts"
import { decodedWith } from "./Decode.ts"
import { plain } from "./Text.ts"
import {
  ClockPayload,
  DeferredPayload,
  Exit,
  json,
  type MessageRow,
  type Reason,
  type ReplyRow,
  Result,
  RunPayload,
  StepPayload,
  type Storage
} from "./Rows.ts"

const workflowPrefix = "Workflow/"

const clockEntity = "Workflow/-/DurableClock"

const clockDeferred = "DurableClock/"

export const at = (id: string): number => Snowflake.timestamp(Snowflake.Snowflake(id))

const fromText =
  <A>(decode: (input: unknown) => Option.Option<A>) =>
  (text: string | null): Option.Option<A> =>
    text === null ? Option.none() : decode(text)

const stepPayload = fromText(Schema.decodeUnknownOption(json(StepPayload)))

const clockPayload = fromText(Schema.decodeUnknownOption(json(ClockPayload)))

const deferredPayload = fromText(Schema.decodeUnknownOption(json(DeferredPayload)))

const runPayload = fromText(Schema.decodeUnknownOption(json(RunPayload)))

const ReplyExit = json(Exit)

const replyExit = (reply: ReplyRow): Option.Option<Exit> => Schema.decodeOption(ReplyExit)(reply.payload)

const resultOf = (exit: Exit): Option.Option<Result> =>
  exit._tag === "Success" ? Schema.decodeUnknownOption(Result)(exit.value) : Option.none()

const workflowOf = (entityType: string): Option.Option<string> => {
  if (!Str.startsWith(workflowPrefix)(entityType)) return Option.none()
  if (Str.startsWith(`${workflowPrefix}-/`)(entityType)) return Option.none()

  return Option.some(Str.slice(workflowPrefix.length)(entityType))
}

const Tagged = Schema.Struct({ _tag: Schema.String })

const Messaged = Schema.Struct({ message: Schema.String })

const Named = Schema.Struct({ name: Schema.String })

const detailOf = (value: unknown): Readonly<Record<string, unknown>> | undefined =>
  Predicate.isObject(value) ? Object.fromEntries(Object.entries(value)) : undefined

const fieldsText = (value: unknown): string =>
  Object.entries(detailOf(value) ?? {})
    .filter(([key]) => key !== "_tag")
    .map(([key, field]) => `${key}: ${Predicate.isString(field) ? field : JSON.stringify(field)}`)
    .join(", ")

const messageOf = (value: unknown, fallback: string): string =>
  Option.match(Schema.decodeUnknownOption(Messaged)(value), {
    onNone: () => (fieldsText(value) === "" ? fallback : plain(fieldsText(value))),
    onSome: (found) => plain(found.message)
  })

const failureFromReason = (reason: Reason): Failure => {
  if (reason._tag === "Interrupt")
    return { tag: "Interrupted", message: "interrupted", kind: "interrupt", retryable: false }
  if (reason._tag === "Die") {
    const name = Option.match(Schema.decodeUnknownOption(Named)(reason.defect), {
      onNone: () => "Defect",
      onSome: (found) => found.name
    })

    return { tag: name, message: messageOf(reason.defect, name), kind: "defect", retryable: false }
  }
  const tag = Option.match(Schema.decodeUnknownOption(Tagged)(reason.error), {
    onNone: () => "Error",
    onSome: (found) => found._tag
  })
  const detail = detailOf(reason.error)

  return {
    tag,
    message: messageOf(reason.error, tag),
    kind: "failure",
    retryable: false,
    ...(detail ? { detail } : {})
  }
}

const failureOf = (cause: ReadonlyArray<Reason>): Failure =>
  Option.match(Arr.head(cause), {
    onNone: () => ({ tag: "Unknown", message: "failed without a cause", kind: "defect", retryable: false }),
    onSome: failureFromReason
  })

const interrupted = (cause: ReadonlyArray<Reason>): boolean => cause.some((reason) => reason._tag === "Interrupt")

const outcomeOfExit = (exit: Exit): Outcome => {
  if (exit._tag === "Success") return { _tag: "success", output: exit.value }
  if (interrupted(exit.cause)) return { _tag: "interrupted", by: "cluster" }

  return { _tag: "failure", error: failureOf(exit.cause) }
}

const outcomeOfResult = (result: Result): Outcome =>
  result._tag === "Suspended" ? { _tag: "pending" } : outcomeOfExit(result.exit)

const outcomeOfReply = (reply: Option.Option<ReplyRow>): Outcome =>
  Option.match(Option.flatMap(reply, replyExit), {
    onNone: () => ({ _tag: "pending" }),
    onSome: (exit) =>
      Option.match(resultOf(exit), {
        onNone: () => outcomeOfExit(exit),
        onSome: outcomeOfResult
      })
  })

const statusOfOutcome = (outcome: Outcome): Status => {
  if (outcome._tag === "success") return "done"
  if (outcome._tag === "accepted") return "accepted"
  if (outcome._tag === "failure") return "failed"
  if (outcome._tag === "interrupted") return "interrupted"

  return "running"
}

type Index = {
  readonly replies: ReadonlyMap<string, ReplyRow>
  readonly messages: ReadonlyArray<MessageRow>
}

const byId = Order.mapInput(Order.BigInt, (row: { readonly id: string }) => BigInt(row.id))

const indexOf = (storage: Storage): Index => ({
  replies: new Map(Arr.sort(storage.replies, byId).map((reply) => [reply.requestId, reply])),
  messages: Arr.sort(storage.messages, byId)
})

const replyFor = (index: Index, message: MessageRow): Option.Option<ReplyRow> =>
  Option.fromUndefinedOr(index.replies.get(message.requestId))

const endOf = (index: Index, message: MessageRow): number | null =>
  Option.match(replyFor(index, message), { onNone: () => null, onSome: (reply) => at(reply.id) })

type Step = { readonly name: string; readonly attempt: Attempt }

const spanOf = (message: MessageRow): { readonly span?: { readonly traceId: string; readonly spanId: string } } => {
  if (!message.traceId) return {}
  if (!message.spanId) return {}

  return { span: { traceId: message.traceId, spanId: message.spanId } }
}

const stepOf =
  (index: Index) =>
  (message: MessageRow): Option.Option<Step> =>
    Option.map(stepPayload(message.payload), (payload) => ({
      name: payload.name,
      attempt: {
        n: payload.attempt,
        reason: payload.attempt === 1 ? "first" : "retry",
        scheduledAt: at(message.id),
        startedAt: at(message.id),
        endedAt: endOf(index, message),
        boot: "",
        outcome: outcomeOfReply(replyFor(index, message)),
        ...spanOf(message)
      }
    }))

const lastAttempt = (attempts: Arr.NonEmptyReadonlyArray<Attempt>): Attempt => Arr.lastNonEmpty(attempts)

const retried = (attempt: Attempt): Attempt =>
  attempt.outcome._tag === "failure"
    ? { ...attempt, outcome: { ...attempt.outcome, error: { ...attempt.outcome.error, retryable: true } } }
    : attempt

const activityGroup = (name: string, steps: Arr.NonEmptyReadonlyArray<Step>): Group => {
  const sorted = Arr.sort(
    Arr.map(steps, (step) => step.attempt),
    Order.mapInput(Order.Number, (attempt: Attempt) => attempt.n)
  )
  const attempts = Arr.map(sorted, (attempt, i) => (i < sorted.length - 1 ? retried(attempt) : attempt))
  const last = lastAttempt(attempts)

  return {
    id: `activity:${name}`,
    kind: "activity",
    name,
    status: statusOfOutcome(last.outcome),
    attempts,
    start: Arr.headNonEmpty(attempts).scheduledAt,
    end: last.endedAt
  }
}

const clockGroup =
  (index: Index) =>
  (message: MessageRow): Option.Option<Group> =>
    Option.map(clockPayload(message.payload), (payload) => {
      const end = endOf(index, message)
      const attempt: Attempt = {
        n: 1,
        reason: "first",
        scheduledAt: at(message.id),
        startedAt: at(message.id),
        endedAt: end,
        boot: "",
        outcome: end === null ? { _tag: "pending" } : { _tag: "success", output: null }
      }

      return {
        id: `clock:${payload.name}`,
        kind: "clock",
        name: payload.name,
        summary: `wakes at ${DateTime.formatIso(DateTime.makeUnsafe(payload.wakeUp))}`,
        status: end === null ? "waiting" : "done",
        attempts: [attempt],
        start: at(message.id),
        end: payload.wakeUp
      }
    })

const deferredGroup = (message: MessageRow): Option.Option<Group> =>
  Option.flatMap(deferredPayload(message.payload), (payload) => {
    if (Str.startsWith(clockDeferred)(payload.name)) return Option.none()
    const outcome = outcomeOfExit(payload.exit)

    return Option.some({
      id: `deferred:${payload.name}`,
      kind: "deferred",
      name: payload.name,
      status: statusOfOutcome(outcome),
      attempts: [
        {
          n: 1,
          reason: "first",
          scheduledAt: at(message.id),
          startedAt: at(message.id),
          endedAt: at(message.id),
          boot: "",
          outcome
        }
      ],
      start: at(message.id),
      end: at(message.id)
    })
  })

const groupsFor = (index: Index, run: MessageRow): ReadonlyArray<Group> => {
  const own = index.messages.filter(
    (message) => message.entityType === run.entityType && message.entityId === run.entityId
  )
  const steps = Arr.getSomes(own.filter((message) => message.tag === "activity").map(stepOf(index)))
  const activities = Object.entries(Arr.groupBy(steps, (step) => step.name)).map(([name, group]) =>
    activityGroup(name, group)
  )
  const clocks = Arr.getSomes(
    index.messages
      .filter((message) => message.entityType === clockEntity && message.entityId === run.entityId)
      .map(clockGroup(index))
  )
  const deferreds = Arr.getSomes(own.filter((message) => message.tag === "deferred").map(deferredGroup))

  return Arr.sort(
    [...withCompensations(activities), ...clocks, ...deferreds],
    Order.mapInput(Order.Number, (group: Group) => group.start)
  )
}

const failedAt = (activities: ReadonlyArray<Group>): Option.Option<Group> =>
  Arr.head(
    Arr.sort(
      activities.filter((group) => group.status === "failed"),
      Order.mapInput(Order.Number, (group: Group) => group.end ?? group.start)
    )
  )

const asCompensation =
  (failed: Group) =>
  (group: Group): Group => {
    if (group.start < (failed.end ?? failed.start)) return group

    return { ...group, kind: "compensation", summary: `ran after ${failed.name} failed` }
  }

const withCompensations = (activities: ReadonlyArray<Group>): ReadonlyArray<Group> =>
  Option.match(failedAt(activities), {
    onNone: () => activities,
    onSome: (failed) => activities.map(asCompensation(failed))
  })

const runOutcome = (index: Index, run: MessageRow): Outcome => outcomeOfReply(replyFor(index, run))

const inFlight = (group: Group): boolean =>
  group.kind !== "clock" && group.attempts.some((attempt) => attempt.endedAt === null)

const runStatus = (run: MessageRow, outcome: Outcome, groups: ReadonlyArray<Group>): Status => {
  if (outcome._tag !== "pending") return statusOfOutcome(outcome)
  if (groups.some(inFlight)) return "running"
  if (groups.some((group) => group.status === "waiting")) return "waiting"
  if (!run.processed) return "queued"

  return "waiting"
}

export const signalWait = "waiting on a signal (a DurableDeferred); storage names it only once it arrives"

const waitingOn = (groups: ReadonlyArray<Group>): string =>
  Option.match(
    Arr.findFirst(groups, (group) => group.status === "waiting"),
    {
      onNone: () => signalWait,
      onSome: (group) =>
        `${group.kind === "clock" ? "durable sleep" : group.kind} ${group.name}, ${group.summary ?? "waiting"}`
    }
  )

const runningDetails = (groups: ReadonlyArray<Group>): string | undefined =>
  Option.getOrUndefined(
    Option.map(Arr.findFirst(groups, inFlight), (group) => `running ${group.name}, attempt ${group.attempts.length}`)
  )

const detailsFor = (status: Status, groups: ReadonlyArray<Group>): string | undefined => {
  if (status === "waiting") return waitingOn(groups)
  if (status === "running") return runningDetails(groups)

  return undefined
}

type Mark = { readonly at: number; readonly kind: EventKind; readonly group?: string; readonly label: string }

const attemptMarks = (group: Group): ReadonlyArray<Mark> =>
  group.attempts.flatMap((attempt): ReadonlyArray<Mark> => {
    const label = `${group.name} #${attempt.n}`
    const started: Mark = { at: attempt.scheduledAt, kind: "attempt started", group: group.id, label }
    if (attempt.endedAt === null) return [started]
    const ended: EventKind = attempt.outcome._tag === "failure" ? "attempt failed" : "completed"

    return [started, { at: attempt.endedAt, kind: ended, group: group.id, label }]
  })

const compensationMarks = (group: Group): ReadonlyArray<Mark> => {
  const started: Mark = { at: group.start, kind: "compensation started", group: group.id, label: group.name }

  return group.end === null
    ? [started]
    : [started, { at: group.end, kind: "compensation done", group: group.id, label: group.name }]
}

const groupMarks = (group: Group): ReadonlyArray<Mark> => {
  if (group.kind === "clock") {
    const set: Mark = { at: group.start, kind: "clock set", group: group.id, label: group.name }

    return group.status === "done"
      ? [set, { at: group.end ?? group.start, kind: "clock fired", group: group.id, label: group.name }]
      : [set]
  }
  if (group.kind === "deferred")
    return [{ at: group.start, kind: "deferred completed", group: group.id, label: group.name }]
  if (group.kind === "compensation") return compensationMarks(group)

  return attemptMarks(group)
}

const finishMark = (status: Status, end: number | null): ReadonlyArray<Mark> => {
  if (end === null) return []
  if (status === "failed") return [{ at: end, kind: "failed", label: "run" }]

  return [{ at: end, kind: "finished", label: "run" }]
}

const eventsFor = (
  start: number,
  groups: ReadonlyArray<Group>,
  status: Status,
  end: number | null
): ReadonlyArray<WfEvent> =>
  Arr.sort(
    [
      { at: start, kind: "started", label: "run" } satisfies Mark,
      ...groups.flatMap(groupMarks),
      ...finishMark(status, end)
    ],
    Order.mapInput(Order.Number, (mark: Mark) => mark.at)
  ).map((mark, i) => ({
    n: i + 1,
    at: mark.at,
    kind: mark.kind,
    ...(mark.group ? { group: mark.group } : {}),
    key: { label: "step", value: mark.label },
    fields: {}
  }))

export type Options = { readonly workflows?: ReadonlyArray<DecodableWorkflow> }

const executionOf = (index: Index, workflow: string, run: MessageRow): Execution => {
  const groups = groupsFor(index, run)
  const outcome = runOutcome(index, run)
  const status = runStatus(run, outcome, groups)
  const start = at(run.id)
  const end = outcome._tag === "pending" ? null : endOf(index, run)
  const details = detailsFor(status, groups)

  return {
    id: run.entityId,
    workflow,
    status,
    startedAt: start,
    endedAt: end,
    trigger: "api",
    boot: "",
    boots: [],
    input: Option.getOrNull(runPayload(run.payload)),
    ...(outcome._tag === "success" ? { result: outcome.output } : {}),
    ...(outcome._tag === "failure" ? { failure: outcome.error } : {}),
    ...(details ? { currentDetails: details } : {}),
    payloads: "raw",
    ...(run.traceId ? { traceId: run.traceId } : {}),
    groups,
    events: eventsFor(start, groups, status, end)
  }
}

export const executions = (storage: Storage, options?: Options): ReadonlyArray<Execution> => {
  const index = indexOf(storage)
  const workflows = options?.workflows ?? []

  return Arr.getSomes(
    index.messages
      .filter((message) => message.tag === "run")
      .map((run) =>
        Option.map(workflowOf(run.entityType), (workflow) => decodedWith(workflows)(executionOf(index, workflow, run)))
      )
  ).toReversed()
}

export const workflowNames = (storage: Storage): ReadonlyArray<string> =>
  Arr.sort(Arr.dedupe(Arr.getSomes(storage.messages.map((message) => workflowOf(message.entityType)))), Str.Order)
