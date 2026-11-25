import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { HtmlBuilder } from "foldkit/html"

type Style = StyleXStyles | false | null | undefined

type Vars = { readonly [name: string]: string }

const stringValues = (style: { readonly [key: string]: string | number }): Vars =>
  Object.fromEntries(Object.entries(style).map(([key, value]) => [key, String(value)]))

export const sxv = <Message>(h: HtmlBuilder<Message>, vars: Vars, ...styles: ReadonlyArray<Style>) => {
  const { className, style } = stylex.props(...styles)
  const inline = { ...(style === undefined ? {} : stringValues(style)), ...vars }

  return [
    ...(className === undefined ? [] : [h.Class(className)]),
    ...(Object.keys(inline).length === 0 ? [] : [h.Style(inline)])
  ]
}

export const sx = <Message>(h: HtmlBuilder<Message>, ...styles: ReadonlyArray<Style>) => sxv(h, {}, ...styles)
