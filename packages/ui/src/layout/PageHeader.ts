import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"
import { Stack } from "./Stack.ts"

const styles = stylex.create({
  title: {
    margin: 0,
    fontSize: shape.textLarge,
    fontWeight: 750,
    letterSpacing: "-0.025em",
    color: colors.ink,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap"
  },
  meta: { color: colors.inkSoft, fontSize: shape.textSmall }
})

export type PageHeaderProps = {
  readonly title: ReadonlyArray<Html | string>
  readonly meta?: ReadonlyArray<Html | string>
  readonly actions?: ReadonlyArray<Html>
}

export const PageHeader = <M>(h: HtmlBuilder<M>, props: PageHeaderProps): Html =>
  Stack(h, {
    direction: "row",
    spread: true,
    top: true,
    children: [
      Stack(h, {
        gap: 4,
        children: [
          h.h1(sx(h, styles.title), props.title),
          ...(props.meta === undefined ? [] : [h.div(sx(h, styles.meta), props.meta)])
        ]
      }),
      ...(props.actions === undefined ? [] : [Stack(h, { direction: "row", gap: 8, children: props.actions })])
    ]
  })
