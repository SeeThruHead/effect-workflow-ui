import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

export type StepItem = {
  readonly key: string
  readonly name: string
  readonly status: "running" | "done" | "accepted" | "failed"
  readonly detail: string
  readonly took: string
  readonly badges: ReadonlyArray<Html>
  readonly body: ReadonlyArray<Html>
}

const styles = stylex.create({
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" },
  item: {
    backgroundColor: colors.surface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderLeftWidth: "4px",
    borderRadius: shape.radius,
    padding: "8px 12px"
  },
  done: { borderLeftColor: colors.done },
  running: { borderLeftColor: colors.running },
  failed: { borderLeftColor: colors.failed },
  accepted: { borderLeftColor: colors.accepted },
  summary: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" },
  name: { fontWeight: 650 },
  detail: {
    color: colors.inkSoft,
    fontSize: shape.textSmall,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0
  },
  right: {
    marginLeft: "auto",
    display: "flex",
    gap: "6px",
    alignItems: "center",
    color: colors.inkSoft,
    fontSize: shape.textSmall,
    whiteSpace: "nowrap"
  },
  body: { display: "flex", flexDirection: "column", gap: "8px", paddingTop: "8px" }
})

export const StepList = <M>(h: HtmlBuilder<M>, props: { readonly steps: ReadonlyArray<StepItem> }): Html =>
  h.ol(
    sx(h, styles.list),
    props.steps.map((step) =>
      h.li(sx(h, styles.item, styles[step.status]), [
        h.details(
          [],
          [
            h.summary(sx(h, styles.summary), [
              h.span(sx(h, styles.name), [step.name]),
              h.span(sx(h, styles.detail), [step.detail]),
              h.span(sx(h, styles.right), [...step.badges, step.took])
            ]),
            h.div(sx(h, styles.body), step.body)
          ]
        )
      ])
    )
  )
