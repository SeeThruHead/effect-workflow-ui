import { Recording } from "@effect-workflow/reader"
import { Schema } from "effect"

export const Page = Schema.Union([
  Schema.TaggedStruct("Attention", {}),
  Schema.TaggedStruct("Runs", {}),
  Schema.TaggedStruct("Cluster", {}),
  Schema.TaggedStruct("Run", { id: Schema.String }),
  Schema.TaggedStruct("Missing", { path: Schema.String })
])

export type Page = typeof Page.Type

export const Data = Schema.Union([
  Schema.TaggedStruct("Loading", {}),
  Schema.TaggedStruct("Loaded", { recording: Recording }),
  Schema.TaggedStruct("Unreadable", { message: Schema.String })
])

export type Data = typeof Data.Type

export const Filter = Schema.Literals(["all", "running", "waiting", "done", "failed"])

export type Filter = typeof Filter.Type

export const HistoryView = Schema.Literals(["events", "steps", "json"])

export type HistoryView = typeof HistoryView.Type

export const Model = Schema.Struct({
  page: Page,
  data: Data,
  filter: Filter,
  workflow: Schema.String,
  query: Schema.String,
  selected: Schema.String,
  view: HistoryView
})

export type Model = typeof Model.Type
