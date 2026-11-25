import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

export type BannerTone = "calm" | "warn" | "alarm"

const styles = stylex.create({
  banner: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    padding: "10px 14px",
    borderRadius: shape.radiusSmall,
    borderWidth: "1px",
    borderStyle: "solid",
    borderLeftWidth: "4px"
  },
  calm: { backgroundColor: colors.waitingSoft, borderColor: colors.waiting },
  warn: { backgroundColor: colors.retryingSoft, borderColor: colors.retrying },
  alarm: { backgroundColor: colors.failedSoft, borderColor: colors.failed },
  title: { fontWeight: 650, color: colors.ink },
  text: { color: colors.inkSoft, fontSize: shape.text }
})

export const Banner = <M>(
  h: HtmlBuilder<M>,
  props: { readonly tone: BannerTone; readonly title: string; readonly text: string }
): Html =>
  h.div(
    [...sx(h, styles.banner, styles[props.tone]), h.Role("status")],
    [h.span(sx(h, styles.title), [props.title]), h.span(sx(h, styles.text), [props.text])]
  )
