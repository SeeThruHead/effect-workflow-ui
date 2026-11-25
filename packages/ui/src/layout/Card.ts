import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

const styles = stylex.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radius,
    boxShadow: shape.shadow,
    padding: "16px 18px",
    minWidth: 0
  },
  flush: { padding: 0, overflow: "hidden" }
})

export const Card = <M>(
  h: HtmlBuilder<M>,
  props: { readonly flush?: boolean; readonly children: ReadonlyArray<Html> }
): Html => h.div(sx(h, styles.card, props.flush === true && styles.flush), props.children)
