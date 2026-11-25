import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

const styles = stylex.create({
  chip: {
    appearance: "none",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: shape.radiusPill,
    padding: "5px 12px",
    fontFamily: shape.font,
    fontSize: "13px",
    color: colors.ink,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px"
  },
  on: { borderColor: colors.accent, backgroundColor: colors.accent, color: colors.accentInk },
  count: { fontWeight: 650, color: "inherit", opacity: 0.6, fontVariantNumeric: "tabular-nums" }
})

export type ChipProps<M> = {
  readonly label: string
  readonly count?: number
  readonly pressed: boolean
  readonly onPress: M
}

export const Chip = <M>(h: HtmlBuilder<M>, props: ChipProps<M>): Html =>
  h.button(
    [
      ...sx(h, styles.chip, props.pressed && styles.on),
      h.Type("button"),
      h.AriaPressed(props.pressed ? "true" : "false"),
      h.OnClick(props.onPress)
    ],
    [props.label, ...(props.count === undefined ? [] : [h.b(sx(h, styles.count), [String(props.count)])])]
  )
