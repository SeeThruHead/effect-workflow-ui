import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"
import { Stack } from "./Stack.ts"

const styles = stylex.create({
  title: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    color: colors.ink,
    fontFamily: shape.font
  }
})

export type SectionProps = {
  readonly title: string
  readonly actions?: ReadonlyArray<Html>
  readonly children: ReadonlyArray<Html>
}

export const Section = <M>(h: HtmlBuilder<M>, props: SectionProps): Html =>
  h.section(
    [],
    [
      Stack(h, {
        gap: 10,
        children: [
          Stack(h, {
            direction: "row",
            spread: true,
            children: [
              h.h2(sx(h, styles.title), [props.title]),
              ...(props.actions === undefined ? [] : [Stack(h, { direction: "row", gap: 8, children: props.actions })])
            ]
          }),
          ...props.children
        ]
      })
    ]
  )
