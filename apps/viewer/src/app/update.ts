import type { Update } from "foldkit"
import type { Url } from "foldkit/url"
import { toString as urlToString } from "foldkit/url"
import { LoadUrl, PushUrl, ReadRecording } from "./Commands.ts"
import { Message } from "./Message.ts"
import type { Model } from "./Model.ts"
import { pageOfUrl } from "./Routes.ts"
import type { Source } from "./Source.ts"

type Return = Update.Return<Model, Message, Source>

export const initialModel = (url: Url): Model => ({
  page: pageOfUrl(url),
  data: { _tag: "Loading" },
  filter: "all",
  workflow: "all",
  query: "",
  selected: "",
  view: "events"
})

export const init = (url: Url): Return => ({ model: initialModel(url), commands: [ReadRecording()] })

export const update = (model: Model, message: Message): Return =>
  Message.match<Return>(message, {
    ChangedUrl: ({ url }) => ({ model: { ...model, page: pageOfUrl(url), selected: "" } }),
    ClickedLink: ({ request }) =>
      request._tag === "Internal"
        ? { model, commands: [PushUrl({ href: urlToString(request.url) })] }
        : { model, commands: [LoadUrl({ href: request.href })] },
    RequestedPage: ({ href }) => ({ model, commands: [PushUrl({ href })] }),
    CompletedNavigation: () => ({ model }),
    Ticked: () => ({ model, commands: [ReadRecording()] }),
    SucceededReadRecording: ({ recording }) => ({ model: { ...model, data: { _tag: "Loaded", recording } } }),
    FailedReadRecording: ({ message: text }) =>
      model.data._tag === "Loaded" ? { model } : { model: { ...model, data: { _tag: "Unreadable", message: text } } },
    ChangedFilter: ({ filter }) => ({ model: { ...model, filter } }),
    ChangedWorkflow: ({ workflow }) => ({ model: { ...model, workflow } }),
    ChangedQuery: ({ query }) => ({ model: { ...model, query } }),
    SelectedStep: ({ id }) => ({ model: { ...model, selected: model.selected === id ? "" : id } }),
    ChangedHistoryView: ({ view }) => ({ model: { ...model, view } }),
    Copied: () => ({ model })
  })
