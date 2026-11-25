import { Recording } from "@effect-workflow/reader"
import { Schema } from "effect"
import { Url } from "foldkit/url"
import { UrlRequest } from "foldkit/navigation"
import { defineMessageUnion } from "foldkit/message"
import { Filter, HistoryView } from "./Model.ts"

export const Message = defineMessageUnion({
  ChangedUrl: { url: Url },
  ClickedLink: { request: UrlRequest },
  RequestedPage: { href: Schema.String },
  CompletedNavigation: {},
  Ticked: {},
  SucceededReadRecording: { recording: Recording },
  FailedReadRecording: { message: Schema.String },
  ChangedFilter: { filter: Filter },
  ChangedWorkflow: { workflow: Schema.String },
  ChangedQuery: { query: Schema.String },
  SelectedStep: { id: Schema.String },
  ChangedHistoryView: { view: HistoryView },
  Copied: {}
})

export type Message = typeof Message.Type
