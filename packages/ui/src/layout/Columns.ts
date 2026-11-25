import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sxv } from "../theme/sx.ts"

const styles = stylex.create({
  columns: {
    display: "grid",
    gridTemplateColumns: "repeat(var(--count), minmax(0, 1fr))",
    gap: "var(--gap)",
    alignItems: "start"
  }
})

export const Columns = <M>(
  h: HtmlBuilder<M>,
  props: { readonly gap?: number; readonly children: ReadonlyArray<Html> }
): Html =>
  h.div(
    sxv(h, { "--count": String(props.children.length), "--gap": `${props.gap ?? 12}px` }, styles.columns),
    props.children
  )
