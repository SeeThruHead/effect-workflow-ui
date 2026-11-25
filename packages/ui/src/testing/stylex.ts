import { Predicate } from "effect"

type Value = string | { readonly default: string }

const plain = (value: Value): string => (Predicate.isString(value) ? value : value.default)

export const create = <Styles>(styles: Styles): Styles => styles

export const defineVars = (vars: Readonly<Record<string, Value>>): Readonly<Record<string, string>> =>
  Object.fromEntries(Object.entries(vars).map(([name, value]) => [name, plain(value)]))

export const createTheme = (): Readonly<Record<string, string>> => ({})

export const props = (): { readonly className?: string; readonly style?: Readonly<Record<string, string>> } => ({})
