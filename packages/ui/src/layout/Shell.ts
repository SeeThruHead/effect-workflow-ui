import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

const narrow = "@media (max-width: 900px)"

const styles = stylex.create({
  shell: {
    minHeight: "100vh",
    backgroundColor: colors.bg,
    fontFamily: shape.font,
    color: colors.ink,
    display: "grid",
    gridTemplateColumns: { default: "220px minmax(0, 1fr)", [narrow]: "minmax(0, 1fr)" },
    gridTemplateRows: { default: "auto", [narrow]: "auto 1fr" }
  },
  side: {
    position: { default: "relative", [narrow]: "sticky" },
    top: 0,
    zIndex: 5,
    display: "flex",
    flexDirection: { default: "column", [narrow]: "row" },
    alignItems: { default: "stretch", [narrow]: "center" },
    gap: { default: "26px", [narrow]: "20px" },
    padding: { default: "22px 14px", [narrow]: "10px 16px" },
    backgroundColor: colors.nav,
    borderRightWidth: { default: "1px", [narrow]: 0 },
    borderBottomWidth: { default: 0, [narrow]: "1px" },
    borderStyle: "solid",
    borderColor: colors.line
  },
  brand: {
    color: colors.navInk,
    fontWeight: 800,
    fontSize: "17px",
    letterSpacing: "-0.02em",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    paddingInline: { default: "8px", [narrow]: 0 },
    textDecoration: "none"
  },
  mark: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    borderWidth: "4px",
    borderStyle: "solid",
    borderColor: colors.ink,
    boxShadow: `5px 0 0 -1px ${colors.agent}`
  },
  nav: { display: "flex", flexDirection: { default: "column", [narrow]: "row" }, gap: "2px" },
  link: {
    color: colors.navInkSoft,
    textDecoration: "none",
    fontSize: shape.text,
    fontWeight: 550,
    padding: "7px 10px",
    borderRadius: shape.radiusSmall,
    backgroundColor: { default: "transparent", ":hover": colors.hover }
  },
  current: { color: colors.accent, fontWeight: 650, backgroundColor: colors.accentSoft },
  main: {
    padding: { default: "28px 36px 72px", [narrow]: "18px 16px 48px" },
    maxWidth: "1440px",
    width: "100%",
    minWidth: 0
  }
})

export type NavLink = {
  readonly label: string
  readonly href: string
  readonly current?: boolean
  readonly external?: boolean
}

export const Shell = <M>(
  h: HtmlBuilder<M>,
  props: { readonly brand: string; readonly links: ReadonlyArray<NavLink>; readonly children: ReadonlyArray<Html> }
): Html =>
  h.div(sx(h, styles.shell), [
    h.header(sx(h, styles.side), [
      h.a([...sx(h, styles.brand), h.Href("#/")], [h.span(sx(h, styles.mark), []), props.brand]),
      h.nav(
        sx(h, styles.nav),
        props.links.map((link) =>
          h.a(
            [
              ...sx(h, styles.link, link.current === true && styles.current),
              h.Href(link.href),
              ...(link.current === true ? [h.AriaCurrent("page")] : []),
              ...(link.external === true ? [h.Target("_blank")] : [])
            ],
            [link.label]
          )
        )
      )
    ]),
    h.main(sx(h, styles.main), props.children)
  ])
