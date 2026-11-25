import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

const styles = stylex.create({
  list: {
    display: "flex",
    maxWidth: "100%",
    gap: "2px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    overflowX: "auto",
    scrollbarWidth: "none"
  },
  tab: {
    appearance: "none",
    borderWidth: 0,
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    marginBottom: "-1px",
    backgroundColor: "transparent",
    padding: "8px 12px",
    fontFamily: shape.font,
    fontSize: "13.5px",
    fontWeight: 550,
    color: { default: colors.inkSoft, ":hover": colors.ink },
    whiteSpace: "nowrap",
    flexShrink: 0,
    cursor: "pointer"
  },
  selected: { color: colors.ink, fontWeight: 650, borderBottomColor: colors.accent },
  count: {
    color: colors.inkFaint,
    marginLeft: "6px",
    fontWeight: 600,
    fontSize: "12px",
    fontVariantNumeric: "tabular-nums"
  }
})

export type Tab<M> = {
  readonly label: string
  readonly count?: number
  readonly selected: boolean
  readonly onSelect: M
}

export const Tabs = <M>(
  h: HtmlBuilder<M>,
  props: { readonly label: string; readonly tabs: ReadonlyArray<Tab<M>> }
): Html =>
  h.div(
    [...sx(h, styles.list), h.Role("tablist"), h.AriaLabel(props.label)],
    props.tabs.map((tab) =>
      h.button(
        [
          ...sx(h, styles.tab, tab.selected && styles.selected),
          h.Type("button"),
          h.Role("tab"),
          h.AriaSelected(tab.selected),
          h.OnClick(tab.onSelect)
        ],
        [tab.label, ...(tab.count === undefined ? [] : [h.span(sx(h, styles.count), [String(tab.count)])])]
      )
    )
  )
