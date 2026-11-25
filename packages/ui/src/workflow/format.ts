import { DateTime } from "effect"
import type { Status } from "./model.ts"

export const span = (ms: number): string => {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1000)
  if (minutes < 60) return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export const time = (at: number): string =>
  DateTime.formatLocal(DateTime.makeUnsafe(at), {
    locale: "en-GB",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })

export const stamp = (at: number): string =>
  `${DateTime.formatLocal(DateTime.makeUnsafe(at), { locale: "en-GB", month: "short", day: "numeric" })}, ${time(at)}`

export const statusLabel: Readonly<Record<Status, string>> = {
  queued: "Queued",
  running: "Running",
  waiting: "Waiting",
  retrying: "Retrying",
  done: "Done",
  accepted: "Done, with failure",
  failed: "Failed",
  interrupted: "Interrupted",
  compensating: "Compensating",
  suspended: "Suspended"
}

export const statusMeaning: Readonly<Record<Status, string>> = {
  queued: "Scheduled, no process has picked it up yet",
  running: "A process is executing it now",
  waiting: "Parked on a durable clock or deferred; nothing is wrong",
  retrying: "The last attempt failed and the next one is scheduled",
  done: "Finished successfully",
  accepted: "Finished with a failure the workflow chose to carry on past",
  failed: "Finished with a failure that ended it",
  interrupted: "Stopped from outside: a cancel, or its process died",
  compensating: "Undoing earlier steps after a failure",
  suspended: "Paused by the engine until something resumes it"
}

export const pretty = (value: unknown): string =>
  typeof value === "string" ? value : (JSON.stringify(value, null, 2) ?? "null")
