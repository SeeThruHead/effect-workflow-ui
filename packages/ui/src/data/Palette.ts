import * as stylex from "@stylexjs/stylex"
import type { Html, HtmlBuilder } from "foldkit/html"
import { sx } from "../theme/sx.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

const styles = stylex.create({
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "10px" },
  swatch: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.line,
    borderRadius: shape.radiusSmall,
    overflow: "hidden",
    backgroundColor: colors.surface,
    fontFamily: shape.font
  },
  colour: { height: "44px", display: "flex", alignItems: "center", gap: "8px", paddingInline: "10px" },
  dot: { width: "8px", height: "8px", borderRadius: "50%" },
  word: { fontSize: shape.textSmall, fontWeight: 650 },
  meta: { padding: "6px 10px", fontSize: shape.textTiny, color: colors.inkSoft },
  queued: { color: colors.queued, backgroundColor: colors.queuedSoft },
  running: { color: colors.running, backgroundColor: colors.runningSoft },
  waiting: { color: colors.waiting, backgroundColor: colors.waitingSoft },
  retrying: { color: colors.retrying, backgroundColor: colors.retryingSoft },
  done: { color: colors.done, backgroundColor: colors.doneSoft },
  accepted: { color: colors.accepted, backgroundColor: colors.acceptedSoft },
  failed: { color: colors.failed, backgroundColor: colors.failedSoft },
  interrupted: { color: colors.interrupted, backgroundColor: colors.interruptedSoft },
  compensating: { color: colors.compensating, backgroundColor: colors.compensatingSoft },
  suspended: { color: colors.suspended, backgroundColor: colors.suspendedSoft },
  agent: { color: colors.agent, backgroundColor: colors.agentSoft },
  tool: { color: colors.tool, backgroundColor: colors.toolSoft },
  bg: { color: colors.ink, backgroundColor: colors.bg },
  surface: { color: colors.ink, backgroundColor: colors.surface },
  sunken: { color: colors.ink, backgroundColor: colors.sunken },
  accent: { color: colors.accentInk, backgroundColor: colors.accent }
})

export type Tone = keyof typeof meanings

const meanings = {
  queued: "scheduled, not picked up yet",
  running: "an attempt is executing",
  waiting: "parked on a clock, a message or a reply",
  retrying: "an attempt failed, the next is scheduled",
  done: "finished with a result",
  accepted: "failed, and the workflow carried on",
  failed: "failed, and the workflow failed with it",
  interrupted: "stopped by a person or a restart",
  compensating: "undoing earlier steps",
  suspended: "stopped until someone resumes it",
  agent: "an agent step and its turns",
  tool: "a tool call inside an agent step",
  bg: "page background",
  surface: "cards, tables, panels",
  sunken: "code, inputs, idle hatching",
  accent: "links, focus, the selected thing"
}

export const Palette = <M>(h: HtmlBuilder<M>, props: { readonly tones: ReadonlyArray<Tone> }): Html =>
  h.div(
    sx(h, styles.grid),
    props.tones.map((tone) =>
      h.div(sx(h, styles.swatch), [
        h.div(sx(h, styles.colour, styles[tone]), [
          h.span([...sx(h, styles.dot), h.Style({ backgroundColor: "currentColor" })], []),
          h.span(sx(h, styles.word), [tone])
        ]),
        h.div(sx(h, styles.meta), [meanings[tone]])
      ])
    )
  )
