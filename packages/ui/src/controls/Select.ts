import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

const styles = stylex.create({
  select: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusSmall,
    padding: "4px 8px",
    backgroundColor: colors.surface,
    fontFamily: shape.font,
    fontSize: "13px",
    color: colors.ink
  }
})

export type SelectProps<M> = {
  readonly label: string
  readonly value: string
  readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>
  readonly onChange: (value: string) => M
}

export const Select = <M>(h: HtmlBuilder<M>, props: SelectProps<M>): Html =>
  h.select(
    [...sx(h, styles.select), h.AriaLabel(props.label), h.OnChange(props.onChange)],
    props.options.map((option) =>
      h.option([h.Value(option.value), ...(option.value === props.value ? [h.Selected(true)] : [])], [option.label])
    )
  )
