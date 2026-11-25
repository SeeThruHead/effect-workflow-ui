import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

export type Turn = { readonly role: string; readonly text: string; readonly tool: string; readonly failed: boolean }

const styles = stylex.create({
  list: { display: "flex", flexDirection: "column", gap: "6px" },
  turn: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusSmall,
    padding: "6px 10px",
    backgroundColor: colors.surface
  },
  user: { backgroundColor: colors.sunken },
  assistant: { backgroundColor: colors.runningSoft },
  call: { backgroundColor: colors.agentSoft },
  failed: { borderColor: colors.failed, borderLeftWidth: "3px" },
  thinking: { borderStyle: "dashed", backgroundColor: "transparent", paddingBlock: "3px", color: colors.inkSoft },
  who: {
    fontSize: "11px",
    fontWeight: 650,
    color: colors.inkSoft,
    textTransform: "uppercase",
    letterSpacing: "0.04em"
  },
  text: {
    margin: "4px 0 0",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily: shape.mono,
    fontSize: "12.5px",
    lineHeight: 1.45,
    maxHeight: "320px",
    overflow: "auto"
  }
})

const tone = (role: string) => {
  if (role === "user") return styles.user
  if (role === "assistant") return styles.assistant
  if (role === "tool call") return styles.call
  if (role === "model turn") return styles.thinking
  return null
}

export const Transcript = <M>(h: HtmlBuilder<M>, props: { readonly turns: ReadonlyArray<Turn> }): Html =>
  h.div(
    sx(h, styles.list),
    props.turns.map((turn) =>
      h.div(sx(h, styles.turn, tone(turn.role), turn.failed && styles.failed), [
        h.div(sx(h, styles.who), [
          `${turn.role}${turn.tool === "" ? "" : ` · ${turn.tool}`}${turn.failed ? " · failed" : ""}`
        ]),
        h.pre(sx(h, styles.text), [turn.text])
      ])
    )
  )
