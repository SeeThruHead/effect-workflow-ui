import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

const styles = stylex.create({
  scroll: { overflowX: "auto", maxWidth: "100%" },
  table: { width: "100%", borderCollapse: "collapse", backgroundColor: colors.surface, fontSize: "14px" },
  head: {
    textAlign: "left",
    padding: "11px 14px",
    backgroundColor: colors.surface,
    fontSize: "12px",
    color: colors.inkFaint,
    fontWeight: 600,
    whiteSpace: "nowrap",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line
  },
  cell: {
    padding: "12px 14px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    verticalAlign: "middle"
  },
  number: { textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" },
  clip: { maxWidth: "520px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  row: {
    cursor: { default: "default", ":hover": "pointer" },
    backgroundColor: { default: "transparent", ":hover": colors.hover }
  },
  alarm: { backgroundColor: colors.failedSoft },
  warn: { backgroundColor: colors.waitingSoft },
  accepted: { backgroundColor: colors.acceptedSoft },
  signal: { backgroundColor: colors.signalSoft },
  mono: { fontFamily: shape.mono, fontSize: "12px", color: colors.inkSoft, whiteSpace: "nowrap" }
})

export type RowTint = "alarm" | "warn" | "accepted" | "signal"

export type Column = { readonly label: string; readonly align?: "number" | "clip" | "mono" }

export type Row<M> = {
  readonly key: string
  readonly cells: ReadonlyArray<Html | string>
  readonly onOpen?: M
  readonly tint?: RowTint
}

export const Table = <M>(
  h: HtmlBuilder<M>,
  props: { readonly label: string; readonly columns: ReadonlyArray<Column>; readonly rows: ReadonlyArray<Row<M>> }
): Html =>
  h.div(sx(h, styles.scroll), [
    h.table(
      [...sx(h, styles.table), h.AriaLabel(props.label)],
      [
        h.thead(
          [],
          [
            h.tr(
              [],
              props.columns.map((column) =>
                h.th(sx(h, styles.head, column.align === "number" && styles.number), [column.label])
              )
            )
          ]
        ),
        h.tbody(
          [],
          props.rows.map((row) =>
            h.tr(
              [
                ...(row.onOpen === undefined ? [] : [h.OnClick(row.onOpen)]),
                ...sx(h, row.onOpen !== undefined && styles.row, row.tint !== undefined && styles[row.tint])
              ],
              row.cells.map((cell, index) => {
                const align = props.columns[index]?.align
                return h.td(
                  sx(
                    h,
                    styles.cell,
                    align === "number" && styles.number,
                    align === "clip" && styles.clip,
                    align === "mono" && styles.mono
                  ),
                  [cell]
                )
              })
            )
          )
        )
      ]
    )
  ])
