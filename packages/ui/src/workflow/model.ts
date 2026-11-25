export type Status =
  | "queued"
  | "running"
  | "waiting"
  | "retrying"
  | "done"
  | "accepted"
  | "failed"
  | "interrupted"
  | "compensating"
  | "suspended"

export type FailureKind = "failure" | "defect" | "interrupt"

export type Failure = {
  readonly tag: string
  readonly message: string
  readonly kind: FailureKind
  readonly retryable: boolean
  readonly cause?: Failure
  readonly stack?: string
  readonly detail?: Readonly<Record<string, unknown>>
}

export type AttemptReason = "first" | "retry" | "restart" | "after wait"

export type Outcome =
  | { readonly _tag: "pending" }
  | { readonly _tag: "success"; readonly output: unknown }
  | { readonly _tag: "accepted"; readonly output: unknown; readonly note: string }
  | { readonly _tag: "failure"; readonly error: Failure }
  | { readonly _tag: "interrupted"; readonly by: string }

export type Attempt = {
  readonly n: number
  readonly reason: AttemptReason
  readonly scheduledAt: number
  readonly startedAt: number | null
  readonly endedAt: number | null
  readonly boot: string
  readonly outcome: Outcome
  readonly nextRetryAt?: number
  readonly heartbeat?: { readonly at: number; readonly detail: string }
}

export type GroupKind = "activity" | "clock" | "deferred" | "child" | "compensation" | "agent" | "queue"

export type Group = {
  readonly id: string
  readonly kind: GroupKind
  readonly name: string
  readonly summary?: string
  readonly input?: unknown
  readonly policy?: { readonly maxAttempts: number; readonly backoff: string; readonly retryOn: string }
  readonly status: Status
  readonly attempts: ReadonlyArray<Attempt>
  readonly start: number
  readonly end: number | null
  readonly compensates?: string
}

export type EventKind =
  | "started"
  | "scheduled"
  | "attempt started"
  | "attempt failed"
  | "retry scheduled"
  | "completed"
  | "accepted failure"
  | "clock set"
  | "clock fired"
  | "deferred awaited"
  | "deferred completed"
  | "message"
  | "interrupt requested"
  | "interrupted"
  | "compensation started"
  | "compensation done"
  | "server restarted"
  | "resumed"
  | "suspended"
  | "failed"
  | "finished"

export type WfEvent = {
  readonly n: number
  readonly at: number
  readonly kind: EventKind
  readonly group?: string
  readonly key: { readonly label: string; readonly value: string }
  readonly fields: Readonly<Record<string, unknown>>
}

export type Execution = {
  readonly id: string
  readonly workflow: string
  readonly status: Status
  readonly startedAt: number
  readonly endedAt: number | null
  readonly trigger: string
  readonly boot: string
  readonly boots: ReadonlyArray<{ readonly id: string; readonly from: number; readonly to: number | null }>
  readonly currentDetails?: string
  readonly input: unknown
  readonly result?: unknown
  readonly failure?: Failure
  readonly payloads?: "decoded" | "mismatch" | "raw"
  readonly traceId?: string
  readonly groups: ReadonlyArray<Group>
  readonly events: ReadonlyArray<WfEvent>
}
