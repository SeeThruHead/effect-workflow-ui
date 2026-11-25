import * as stylex from "@stylexjs/stylex"
import { Schema } from "effect"
import { Runtime } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { defineMessageUnion } from "foldkit/message"
import { sx } from "../theme/sx.ts"
import { dark, darkShape, light, lightShape } from "../theme/themes.ts"
import { colors, shape } from "../theme/tokens.stylex.ts"

const Model = Schema.Struct({
  values: Schema.Record(Schema.String, Schema.String),
  events: Schema.Array(Schema.String)
})
type Model = typeof Model.Type

export const Message = defineMessageUnion({
  Set: { key: Schema.String, value: Schema.String },
  Logged: { event: Schema.String }
})
export type Message = typeof Message.Type

export type Kit = {
  readonly h: HtmlBuilder<Message>
  readonly value: (key: string, fallback: string) => string
  readonly set: (key: string, value: string) => Message
  readonly log: (event: string) => Message
  readonly events: ReadonlyArray<string>
}

export type Globals = { readonly globals: { readonly [name: string]: unknown } }

const styles = stylex.create({
  page: { backgroundColor: colors.bg, color: colors.ink, fontFamily: shape.font, padding: "16px", minHeight: "100%" },
  log: { marginTop: "12px", fontSize: shape.textTiny, color: colors.inkFaint, fontFamily: shape.mono }
})

const update = (model: Model, message: Message): { readonly model: Model; readonly commands: ReadonlyArray<never> } =>
  Message.match(message, {
    Set: ({ key, value }) => ({ model: { ...model, values: { ...model.values, [key]: value } }, commands: [] }),
    Logged: ({ event }) => ({ model: { ...model, events: [...model.events, event] }, commands: [] })
  })

const whenAttached = (container: HTMLElement, start: () => void): void => {
  const check = (): void => {
    if (container.isConnected) return start()
    requestAnimationFrame(check)
  }
  queueMicrotask(check)
}

const themed = (globals: Globals["globals"]): string => {
  if (globals["scheme"] === "dark") return stylex.props(dark, darkShape, styles.page).className ?? ""
  return stylex.props(light, lightShape, styles.page).className ?? ""
}

export const story =
  (view: (kit: Kit) => Html, values: { readonly [key: string]: string } = {}) =>
  (_args: unknown, context: Globals): HTMLElement => {
    const container = document.createElement("div")
    container.setAttribute("id", `wf-story-${document.querySelectorAll("[id^=wf-story-]").length + 1}`)
    const theme = themed(context.globals)
    whenAttached(container, () =>
      Runtime.embed(
        Runtime.makeElement({
          Model,
          init: () => ({ model: { values, events: [] } }),
          update,
          view: (model: Model, h: HtmlBuilder<Message>) =>
            h.div(
              [h.Class(theme)],
              [
                view({
                  h,
                  value: (key, fallback) => model.values[key] ?? fallback,
                  set: (key, value) => Message.Set({ key, value }),
                  log: (event) => Message.Logged({ event }),
                  events: model.events
                }),
                ...(model.events.length === 0
                  ? []
                  : [h.div(sx(h, styles.log), [`last action: ${model.events.at(-1) ?? ""}`])])
              ]
            ),
          container
        })
      )
    )
    return container
  }
