import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sxv } from "../theme/sx.ts"

const styles = stylex.create({
  column: { display: "flex", flexDirection: "column", gap: "var(--gap)", minWidth: 0 },
  row: { display: "flex", alignItems: "center", gap: "var(--gap)", minWidth: 0, flexWrap: "wrap" },
  spread: { justifyContent: "space-between" },
  top: { alignItems: "flex-start" }
})

export type StackProps = {
  readonly gap?: number
  readonly direction?: "column" | "row"
  readonly spread?: boolean
  readonly top?: boolean
  readonly children: ReadonlyArray<Html>
}

export const Stack = <M>(h: HtmlBuilder<M>, props: StackProps): Html =>
  h.div(
    sxv(
      h,
      { "--gap": `${props.gap ?? 12}px` },
      props.direction === "row" ? styles.row : styles.column,
      props.spread === true && styles.spread,
      props.top === true && styles.top
    ),
    props.children
  )
