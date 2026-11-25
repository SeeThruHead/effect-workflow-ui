import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

const styles = stylex.create({
  button: {
    appearance: "none",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.accent,
    borderRadius: shape.radiusSmall,
    backgroundColor: colors.accent,
    color: colors.accentInk,
    fontFamily: shape.font,
    fontSize: "13px",
    fontWeight: 600,
    padding: "5px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px"
  },
  quiet: { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink },
  back: {
    alignSelf: "flex-start",
    color: { default: colors.inkSoft, ":hover": colors.ink },
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: 550,
    fontFamily: shape.font
  }
})

export type ButtonProps<M> = { readonly label: string; readonly onPress: M; readonly tone?: "primary" | "quiet" }

export const Button = <M>(h: HtmlBuilder<M>, props: ButtonProps<M>): Html =>
  h.button(
    [...sx(h, styles.button, props.tone === "quiet" && styles.quiet), h.Type("button"), h.OnClick(props.onPress)],
    [props.label]
  )

export const LinkButton = <M>(
  h: HtmlBuilder<M>,
  props: { readonly label: string; readonly href: string; readonly download?: string }
): Html =>
  h.a(
    [
      ...sx(h, styles.button, styles.quiet),
      h.Href(props.href),
      ...(props.download === undefined ? [] : [h.Download(props.download)])
    ],
    [props.label]
  )

export const BackLink = <M>(h: HtmlBuilder<M>, props: { readonly label: string; readonly href: string }): Html =>
  h.a([...sx(h, styles.back), h.Href(props.href)], [`← ${props.label}`])
