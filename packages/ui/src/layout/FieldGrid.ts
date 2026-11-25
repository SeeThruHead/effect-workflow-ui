import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 0,
    margin: 0,
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radius,
    overflow: "hidden",
    boxShadow: shape.shadow
  },
  field: {
    padding: "12px 16px 14px",
    backgroundColor: colors.surface,
    minWidth: 0,
    boxShadow: `1px 0 0 ${colors.line}, 0 1px 0 ${colors.line}`
  },
  label: { fontSize: shape.textTiny, fontWeight: 550, color: colors.inkFaint },
  value: {
    margin: "6px 0 0",
    fontSize: "15px",
    fontWeight: 600,
    letterSpacing: "-0.01em",
    fontVariantNumeric: "tabular-nums",
    color: colors.ink,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  }
})

export type Field = { readonly label: string; readonly value: Html | string }

export const FieldGrid = <M>(h: HtmlBuilder<M>, props: { readonly fields: ReadonlyArray<Field> }): Html =>
  h.dl(
    sx(h, styles.grid),
    props.fields.map((field) =>
      h.div(sx(h, styles.field), [h.dt(sx(h, styles.label), [field.label]), h.dd(sx(h, styles.value), [field.value])])
    )
  )
