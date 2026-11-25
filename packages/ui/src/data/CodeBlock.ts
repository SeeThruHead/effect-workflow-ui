import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

const styles = stylex.create({
  code: {
    fontFamily: shape.mono,
    fontSize: "12.5px",
    lineHeight: 1.45,
    backgroundColor: colors.code,
    color: colors.codeInk,
    borderRadius: shape.radiusSmall,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    padding: "10px 12px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: "420px",
    overflow: "auto",
    margin: 0
  },
  error: { backgroundColor: colors.failedSoft, color: colors.failedInk }
})

export const CodeBlock = <M>(h: HtmlBuilder<M>, props: { readonly text: string; readonly tone?: "error" }): Html =>
  h.pre(sx(h, styles.code, props.tone === "error" && styles.error), [props.text])
