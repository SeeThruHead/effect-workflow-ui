import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors } from "../theme/tokens.stylex.ts"

const styles = stylex.create({
  summary: { cursor: "pointer", fontWeight: 600, color: colors.ink, listStylePosition: "inside" },
  body: { paddingTop: "8px" }
})

export const Disclosure = <M>(
  h: HtmlBuilder<M>,
  props: {
    readonly summary: ReadonlyArray<Html | string>
    readonly open?: boolean
    readonly children: ReadonlyArray<Html>
  }
): Html =>
  h.details(props.open === true ? [h.Open(true)] : [], [
    h.summary(sx(h, styles.summary), props.summary),
    h.div(sx(h, styles.body), props.children)
  ])
