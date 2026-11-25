import { String as Str } from "effect"

export const escaped = (text: string): string =>
  Str.replaceAll(">", "&gt;")(Str.replaceAll("<", "&lt;")(Str.replaceAll("&", "&amp;")(text)))

const keywords = new Set([
  "import",
  "from",
  "export",
  "const",
  "type",
  "readonly",
  "return",
  "function",
  "yield",
  "new",
  "if",
  "await",
  "async"
])

const tokens =
  /(#[^\n]*|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`[^`]*`|\b[A-Za-z_][A-Za-z0-9_-]*\b|\b\d+\b)/

export type Language = "ts" | "sh"

const isComment = (segment: string, language: Language): boolean => {
  if (Str.startsWith("//")(segment)) return true

  return language === "sh" && Str.startsWith("#")(segment)
}

const kindOf = (segment: string, next: string, language: Language): string | undefined => {
  if (isComment(segment, language)) return "note"
  if (/^["'`]/.test(segment)) return "string"
  if (/^\d+$/.test(segment)) return "number"
  if (language === "sh") return /^(docker|bun|bunx|curl)$/.test(segment) ? "call" : undefined
  if (keywords.has(segment)) return "keyword"
  if (/^[A-Z]/.test(segment)) return "type"
  if (Str.startsWith("(")(next)) return "call"

  return undefined
}

const painted = (segment: string, kind: string | undefined): string =>
  kind === undefined ? escaped(segment) : `<span class="tok-${kind}">${escaped(segment)}</span>`

export const highlight = (code: string, language: Language): string => {
  const parts = Str.split(tokens)(code)

  return `<pre class="code" data-language="${language}"><code>${parts
    .map((part, i) => (i % 2 === 1 ? painted(part, kindOf(part, parts[i + 1] ?? "", language)) : escaped(part)))
    .join("")}</code></pre>`
}
