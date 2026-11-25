import { Option, String as Str } from "effect"
import type { Url } from "foldkit/url"
import type { Page } from "./Model.ts"

export const attentionHref = "#/"

export const runsHref = "#/runs"

export const runHref = (id: string): string => `#/runs/${encodeURIComponent(id)}`

const runPath = /^\/runs\/([^/]+)$/

export const pageOfHash = (hash: string): Page => {
  const path = Str.replace(/^#/, "")(hash)
  if (path === "" || path === "/") return { _tag: "Attention" }
  if (path === "/runs") return { _tag: "Runs" }
  const run = runPath.exec(path)
  if (run?.[1] !== undefined) return { _tag: "Run", id: decodeURIComponent(run[1]) }

  return { _tag: "Missing", path }
}

export const pageOfUrl = (url: Url): Page => pageOfHash(Option.getOrElse(url.hash, () => ""))
