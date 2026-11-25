import { DateTime, Option, Schema } from "effect"

export const duration = (ms: number): string => {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ${Math.round((ms % 3_600_000) / 60_000)}m`

  return `${Math.floor(ms / 86_400_000)}d ${Math.round((ms % 86_400_000) / 3_600_000)}h`
}

export const clock = (at: number): string =>
  DateTime.formatLocal(DateTime.makeUnsafe(at), {
    locale: "en-GB",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })

const decodeJson = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown))

export const json = (text: string | null): unknown => (text === null ? null : Option.getOrNull(decodeJson(text)))
