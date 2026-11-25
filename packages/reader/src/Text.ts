import { String as Str } from "effect"

const escapes = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g")

const controls = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(8)}${String.fromCharCode(11)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
  "g"
)

export const plain = (text: string): string => Str.replace(controls, "")(Str.replace(escapes, "")(text))

const drawing = /[─-▟]+/g

export const brief = (text: string, limit = 240): string => {
  const flat = Str.trim(Str.replace(/\s+/g, " ")(Str.replace(drawing, " ")(text)))

  return flat.length <= limit ? flat : `${Str.trimEnd(Str.slice(0, limit)(flat))}…`
}
