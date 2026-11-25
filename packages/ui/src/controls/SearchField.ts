import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

const styles = stylex.create({
  input: {
    width: "min(520px, 60vw)",
    padding: "8px 12px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radius,
    backgroundColor: colors.surface,
    fontFamily: shape.font,
    fontSize: shape.text,
    color: colors.ink
  }
})

export type SearchFieldProps<M> = {
  readonly label: string
  readonly value: string
  readonly placeholder: string
  readonly onInput: (value: string) => M
}

export const SearchField = <M>(h: HtmlBuilder<M>, props: SearchFieldProps<M>): Html =>
  h.input([
    ...sx(h, styles.input),
    h.Type("search"),
    h.AriaLabel(props.label),
    h.Placeholder(props.placeholder),
    h.Value(props.value),
    h.OnInput(props.onInput)
  ])
