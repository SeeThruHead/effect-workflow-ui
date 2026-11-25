import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors } from "../theme/tokens.stylex.ts"

const styles = stylex.create({ empty: { color: colors.inkSoft, padding: "18px 4px", fontSize: "13.5px" } })

export const EmptyState = <M>(h: HtmlBuilder<M>, props: { readonly text: string }): Html =>
  h.p(sx(h, styles.empty), [props.text])
